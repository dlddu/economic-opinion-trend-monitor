"""Storage abstraction over the medallion data lake.

The skeleton ships a local-filesystem implementation with three dataset shapes:

- **record datasets** — one JSONL file per dataset (one JSON object per line),
  read and replaced/merged as a whole;
- **partitioned datasets** — JSONL part files under Hive-style ``key=value``
  directories, each part replaced on its own, so writing one slice (a collection
  cycle) leaves every other slice untouched;
- **object datasets** — one file per record, addressed by a key field and laid
  out in Hive-style partitions on the key's first characters, so a record is
  written, checked and read without touching the rest of the dataset.

This is the single seam where a remote store (e.g. S3) would later plug in;
remote implementations are out of scope for the bootstrap (see README — only
the interface + local FS exist).

Records cross this boundary as plain JSON-able ``dict``s. Producers convert
generated dataclasses with ``dataclasses.asdict`` before writing; consumers read
``dict``s and rebuild typed models with ``Model.from_dict``.
"""

from __future__ import annotations

import json
import os
from abc import ABC, abstractmethod
from collections.abc import Callable, Iterable, Mapping
from pathlib import Path

#: Characters of the key that name an object's partition. Changing it is a pure
#: re-layout (the key is the record's identity), but every existing object has to
#: be moved, and the Go reader shares the value.
OBJECT_PARTITION_CHARS = 1


class LakeStore(ABC):
    """Read/write records addressed by ``(layer, dataset)``."""

    @abstractmethod
    def write_records(self, layer: str, dataset: str, records: Iterable[dict]) -> int:
        """Replace the dataset's contents with ``records``; return count written."""
        raise NotImplementedError

    @abstractmethod
    def merge_records(
        self, layer: str, dataset: str, key_field: str, records: Iterable[dict]
    ) -> int:
        """Append only records whose ``key_field`` value is not already stored.

        Idempotent by key: re-merging a stored key is a no-op, a new key appends
        without touching existing records. Returns the count actually appended.
        """
        raise NotImplementedError

    @abstractmethod
    def write_partition(
        self,
        layer: str,
        dataset: str,
        partition: Mapping[str, str],
        part: str,
        records: Iterable[dict],
    ) -> int:
        """Replace one part of a partitioned dataset with ``records``; return count written."""
        raise NotImplementedError

    @abstractmethod
    def read_partitions(self, layer: str, dataset: str) -> list[dict]:
        """Return every record of a partitioned dataset, parts in path order."""
        raise NotImplementedError

    @abstractmethod
    def migrate_records_to_partitions(
        self,
        layer: str,
        dataset: str,
        locate: Callable[[dict], tuple[Mapping[str, str], str]],
    ) -> int:
        """Move a legacy record dataset of the same name into partitions.

        ``locate`` maps a record to its ``(partition, part)``. A no-op once
        migrated. Returns the count of records moved.
        """
        raise NotImplementedError

    @abstractmethod
    def put_object(self, layer: str, dataset: str, key_field: str, record: dict) -> bool:
        """Store ``record`` under ``record[key_field]`` unless that key already exists.

        Returns True if written, False if the key was already stored — the stored
        record is never replaced, which is what keeps a content-addressed dataset
        (``bronze/news_body``) immutable per version (AC1.7).
        """
        raise NotImplementedError

    @abstractmethod
    def get_object(self, layer: str, dataset: str, key_field: str, key: str) -> dict | None:
        """Return the record stored under ``key``, or None if there is none."""
        raise NotImplementedError

    @abstractmethod
    def read_objects(self, layer: str, dataset: str) -> list[dict]:
        """Return every record of an object dataset, ordered by key."""
        raise NotImplementedError

    @abstractmethod
    def migrate_records_to_objects(self, layer: str, dataset: str, key_field: str) -> int:
        """Move a legacy record dataset of the same name into the object layout.

        A no-op once migrated. Returns the count of objects written.
        """
        raise NotImplementedError

    @abstractmethod
    def read_records(self, layer: str, dataset: str) -> list[dict]:
        """Return every record in the dataset (empty list if it does not exist)."""
        raise NotImplementedError


def _check_key(key: str) -> None:
    if not key or key.startswith(".") or any(c in key for c in "/\\="):
        raise ValueError(f"object key {key!r} is not usable as a file name")


class LocalFsStore(LakeStore):
    """Local-filesystem implementation.

    Record datasets live at ``<root>/<layer>/<dataset>.jsonl``; object datasets at
    ``<root>/<layer>/<dataset>/<key_field>_prefix=<key[:1]>/<key>.json``, each file
    a single JSON line.
    """

    def __init__(self, root: Path | str) -> None:
        self.root = Path(root)

    def path(self, layer: str, dataset: str) -> Path:
        return self.root / layer / f"{dataset}.jsonl"

    def write_records(self, layer: str, dataset: str, records: Iterable[dict]) -> int:
        target = self.path(layer, dataset)
        target.parent.mkdir(parents=True, exist_ok=True)
        staging = target.with_name(f".{target.name}.tmp")
        count = 0
        with staging.open("w", encoding="utf-8") as fh:
            for record in records:
                fh.write(json.dumps(record, ensure_ascii=False))
                fh.write("\n")
                count += 1
        os.replace(staging, target)
        return count

    def merge_records(
        self, layer: str, dataset: str, key_field: str, records: Iterable[dict]
    ) -> int:
        existing = {record[key_field] for record in self.read_records(layer, dataset)}
        target = self.path(layer, dataset)
        target.parent.mkdir(parents=True, exist_ok=True)
        added = 0
        with target.open("a", encoding="utf-8") as fh:
            for record in records:
                key = record[key_field]
                if key in existing:
                    continue
                existing.add(key)
                fh.write(json.dumps(record, ensure_ascii=False))
                fh.write("\n")
                added += 1
        return added

    def partition_path(
        self, layer: str, dataset: str, partition: Mapping[str, str], part: str
    ) -> Path:
        target = self.root / layer / dataset
        for column, value in partition.items():
            _check_key(value)
            target /= f"{column}={value}"
        _check_key(part)
        return target / f"{part}.jsonl"

    def write_partition(
        self,
        layer: str,
        dataset: str,
        partition: Mapping[str, str],
        part: str,
        records: Iterable[dict],
    ) -> int:
        target = self.partition_path(layer, dataset, partition, part)
        target.parent.mkdir(parents=True, exist_ok=True)
        staging = target.with_name(f".{target.name}.{os.getpid()}.tmp")
        count = 0
        with staging.open("w", encoding="utf-8") as fh:
            for record in records:
                fh.write(json.dumps(record, ensure_ascii=False))
                fh.write("\n")
                count += 1
        os.replace(staging, target)
        return count

    def read_partitions(self, layer: str, dataset: str) -> list[dict]:
        root = self.root / layer / dataset
        if not root.is_dir():
            return []
        records: list[dict] = []
        for part in sorted(root.rglob("*.jsonl")):
            if part.name.startswith("."):
                continue
            with part.open(encoding="utf-8") as fh:
                records.extend(json.loads(line) for line in fh if line.strip())
        return records

    def migrate_records_to_partitions(
        self,
        layer: str,
        dataset: str,
        locate: Callable[[dict], tuple[Mapping[str, str], str]],
    ) -> int:
        legacy = self.path(layer, dataset)
        if not legacy.exists():
            return 0
        groups: dict[Path, tuple[Mapping[str, str], str, list[dict]]] = {}
        for record in self.read_records(layer, dataset):
            partition, part = locate(record)
            key = self.partition_path(layer, dataset, partition, part)
            groups.setdefault(key, (partition, part, []))[2].append(record)
        moved = sum(
            self.write_partition(layer, dataset, partition, part, records)
            for partition, part, records in groups.values()
        )
        legacy.replace(legacy.with_name(f"{legacy.name}.migrated"))
        return moved

    def object_dir(self, layer: str, dataset: str) -> Path:
        return self.root / layer / dataset

    def object_path(self, layer: str, dataset: str, key_field: str, key: str) -> Path:
        _check_key(key)
        partition = f"{key_field}_prefix={key[:OBJECT_PARTITION_CHARS]}"
        return self.object_dir(layer, dataset) / partition / f"{key}.json"

    def put_object(self, layer: str, dataset: str, key_field: str, record: dict) -> bool:
        target = self.object_path(layer, dataset, key_field, record[key_field])
        if target.exists():
            return False
        target.parent.mkdir(parents=True, exist_ok=True)
        staging = target.with_name(f".{target.name}.{os.getpid()}.tmp")
        staging.write_text(json.dumps(record, ensure_ascii=False) + "\n", encoding="utf-8")
        try:
            # link() refuses an existing target, so a concurrent writer of the same
            # key cannot replace a stored object, and readers never see it half-written.
            os.link(staging, target)
        except FileExistsError:
            return False
        finally:
            staging.unlink()
        return True

    def get_object(self, layer: str, dataset: str, key_field: str, key: str) -> dict | None:
        source = self.object_path(layer, dataset, key_field, key)
        try:
            return json.loads(source.read_text(encoding="utf-8"))
        except FileNotFoundError:
            return None

    def read_objects(self, layer: str, dataset: str) -> list[dict]:
        root = self.object_dir(layer, dataset)
        if not root.is_dir():
            return []
        return [
            json.loads(path.read_text(encoding="utf-8"))
            for path in sorted(root.glob("*=*/*.json"), key=lambda p: p.name)
        ]

    def migrate_records_to_objects(self, layer: str, dataset: str, key_field: str) -> int:
        legacy = self.path(layer, dataset)
        if not legacy.exists():
            return 0
        written = sum(
            self.put_object(layer, dataset, key_field, record)
            for record in self.read_records(layer, dataset)
        )
        # Renamed only after every record landed: a run cut short retries the
        # whole file next time, and put_object skips what already moved.
        legacy.replace(legacy.with_name(f"{legacy.name}.migrated"))
        return written

    def read_records(self, layer: str, dataset: str) -> list[dict]:
        source = self.path(layer, dataset)
        if not source.exists():
            return []
        records: list[dict] = []
        with source.open(encoding="utf-8") as fh:
            for line in fh:
                line = line.strip()
                if line:
                    records.append(json.loads(line))
        return records


def open_store(root: Path | str) -> LakeStore:
    """Open the default (local FS) store at ``root``."""
    return LocalFsStore(root)
