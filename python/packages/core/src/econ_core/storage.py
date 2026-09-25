"""Storage abstraction over the medallion data lake.

The skeleton ships a local-filesystem implementation with three dataset shapes:

- **record datasets** — one JSONL file per dataset (one JSON object per line),
  read and replaced/merged as a whole;
- **partitioned datasets** — one ``data.jsonl`` per Hive-style ``key=value``
  partition directory, each replaced on its own, so writing one slice (a
  collection cycle) leaves every other slice untouched;
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

#: File holding one partition's records (the directories above it name the partition).
PARTITION_FILE = "data.jsonl"

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
        self, layer: str, dataset: str, partition: Mapping[str, str], records: Iterable[dict]
    ) -> int:
        """Replace one partition of a partitioned dataset with ``records``; return count."""
        raise NotImplementedError

    @abstractmethod
    def read_partition(self, layer: str, dataset: str, partition: Mapping[str, str]) -> list[dict]:
        """Return one partition's records (empty list if it does not exist)."""
        raise NotImplementedError

    @abstractmethod
    def partitions(self, layer: str, dataset: str) -> list[dict[str, str]]:
        """Return every existing partition of a dataset, in path order."""
        raise NotImplementedError

    def read_partitions(self, layer: str, dataset: str) -> list[dict]:
        """Return every record of a partitioned dataset, partitions in path order."""
        return [
            record
            for partition in self.partitions(layer, dataset)
            for record in self.read_partition(layer, dataset, partition)
        ]

    @abstractmethod
    def migrate_records_to_partitions(
        self,
        layer: str,
        dataset: str,
        locate: Callable[[dict], Mapping[str, str] | None],
    ) -> int:
        """Move a legacy record dataset of the same name into partitions.

        ``locate`` maps a record to its partition, or None to drop it. A no-op once
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
    def write_object(self, layer: str, dataset: str, key_field: str, record: dict) -> None:
        """Store ``record`` under ``record[key_field]``, replacing any stored version.

        The counterpart of :meth:`put_object`, for an object dataset whose records are
        *revised* rather than content-addressed — a batch run record grows a stage at a
        time, and the stages of one run are separate processes (PRD pipeline-ops, AC4.1).
        ``put_object`` keeps refusing a stored key, which is what makes
        ``bronze/news_body`` immutable; the two never share a dataset.
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

    def dataset_dir(self, layer: str, dataset: str) -> Path:
        return self.root / layer / dataset

    def partition_path(self, layer: str, dataset: str, partition: Mapping[str, str]) -> Path:
        target = self.dataset_dir(layer, dataset)
        for column, value in partition.items():
            _check_key(column)
            _check_key(value)
            target /= f"{column}={value}"
        return target / PARTITION_FILE

    def write_partition(
        self, layer: str, dataset: str, partition: Mapping[str, str], records: Iterable[dict]
    ) -> int:
        target = self.partition_path(layer, dataset, partition)
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

    def read_partition(self, layer: str, dataset: str, partition: Mapping[str, str]) -> list[dict]:
        source = self.partition_path(layer, dataset, partition)
        try:
            with source.open(encoding="utf-8") as fh:
                return [json.loads(line) for line in fh if line.strip()]
        except FileNotFoundError:
            return []

    def partitions(self, layer: str, dataset: str) -> list[dict[str, str]]:
        root = self.dataset_dir(layer, dataset)
        if not root.is_dir():
            return []
        found = []
        for data in sorted(root.rglob(PARTITION_FILE)):
            segments = data.parent.relative_to(root).parts
            found.append(dict(segment.split("=", 1) for segment in segments))
        return found

    def migrate_records_to_partitions(
        self,
        layer: str,
        dataset: str,
        locate: Callable[[dict], Mapping[str, str] | None],
    ) -> int:
        legacy = self.path(layer, dataset)
        if not legacy.exists():
            return 0
        groups: dict[Path, tuple[Mapping[str, str], list[dict]]] = {}
        for record in self.read_records(layer, dataset):
            partition = locate(record)
            if partition is None:
                continue
            key = self.partition_path(layer, dataset, partition)
            groups.setdefault(key, (partition, []))[1].append(record)
        moved = sum(
            self.write_partition(layer, dataset, partition, records)
            for partition, records in groups.values()
        )
        # Renamed only after every partition landed: a run cut short rewrites the same
        # partitions from the same file next time.
        legacy.replace(legacy.with_name(f"{legacy.name}.migrated"))
        return moved

    def object_path(self, layer: str, dataset: str, key_field: str, key: str) -> Path:
        _check_key(key)
        partition = f"{key_field}_prefix={key[:OBJECT_PARTITION_CHARS]}"
        return self.dataset_dir(layer, dataset) / partition / f"{key}.json"

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

    def write_object(self, layer: str, dataset: str, key_field: str, record: dict) -> None:
        target = self.object_path(layer, dataset, key_field, record[key_field])
        target.parent.mkdir(parents=True, exist_ok=True)
        staging = target.with_name(f".{target.name}.{os.getpid()}.tmp")
        staging.write_text(json.dumps(record, ensure_ascii=False) + "\n", encoding="utf-8")
        # Rename over the old version: a reader sees either the previous record or the
        # new one, never a half-written file.
        os.replace(staging, target)

    def get_object(self, layer: str, dataset: str, key_field: str, key: str) -> dict | None:
        source = self.object_path(layer, dataset, key_field, key)
        try:
            return json.loads(source.read_text(encoding="utf-8"))
        except FileNotFoundError:
            return None

    def read_objects(self, layer: str, dataset: str) -> list[dict]:
        root = self.dataset_dir(layer, dataset)
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
