"""Storage abstraction over the medallion data lake.

The skeleton ships a local-filesystem implementation that serializes each
dataset as JSONL (one JSON object per line). This is the single seam where a
remote store (e.g. S3) would later plug in; remote implementations are out of
scope for the bootstrap (see README — only the interface + local FS exist).

Records cross this boundary as plain JSON-able ``dict``s. Producers convert
generated dataclasses with ``dataclasses.asdict`` before writing; consumers read
``dict``s and rebuild typed models with ``Model.from_dict``.
"""

from __future__ import annotations

import json
import os
from abc import ABC, abstractmethod
from collections.abc import Callable, Iterable
from pathlib import Path


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

        Idempotent by key — the seam content-addressed datasets need (e.g.
        ``bronze/news_body`` keyed by ``body_hash``): re-merging an unchanged
        body is a no-op, while a new key (an edited body) appends a new record
        without touching existing ones. Returns the count actually appended.
        """
        raise NotImplementedError

    @abstractmethod
    def read_records(self, layer: str, dataset: str) -> list[dict]:
        """Return every record in the dataset (empty list if it does not exist).

        For a partitioned dataset this is every partition, oldest first, after any
        records still in the unpartitioned file.
        """
        raise NotImplementedError

    @abstractmethod
    def partitions(self, layer: str, dataset: str) -> list[str]:
        """Partition ids of a partitioned dataset, oldest first (empty if none)."""
        raise NotImplementedError

    @abstractmethod
    def read_partition(self, layer: str, dataset: str, partition: str) -> list[dict]:
        """Return one partition's records (empty list if it does not exist)."""
        raise NotImplementedError

    @abstractmethod
    def write_partition(
        self, layer: str, dataset: str, partition: str, records: Iterable[dict]
    ) -> int:
        """Replace one partition's contents; an empty ``records`` removes it."""
        raise NotImplementedError

    @abstractmethod
    def merge_partition(
        self, layer: str, dataset: str, partition: str, key_field: str, records: Iterable[dict]
    ) -> int:
        """:meth:`merge_records` confined to one partition; returns the count appended."""
        raise NotImplementedError

    @abstractmethod
    def partition_flat(
        self, layer: str, dataset: str, partition_of: Callable[[dict], str | None]
    ) -> tuple[int, int]:
        """Move records still in the unpartitioned file into their partitions.

        ``partition_of`` names each record's partition; ``None`` drops the record.
        Records already in the target partition (same JSON) are not duplicated, so
        an interrupted move can simply run again. Returns ``(moved, dropped)``.
        """
        raise NotImplementedError


class LocalFsStore(LakeStore):
    """Local-filesystem JSONL implementation.

    An unpartitioned dataset is ``<root>/<layer>/<dataset>.jsonl``. A partitioned one
    is a Hive-style tree ``<root>/<layer>/<dataset>/<partition>/data.jsonl`` where the
    partition id is ``date=YYYY-MM-DD/hour=HH`` (:func:`econ_core.domain.cycle_partition`)
    — the layout an object store and DuckDB's ``hive_partitioning`` read as is.
    """

    PART_FILE = "data.jsonl"

    def __init__(self, root: Path | str) -> None:
        self.root = Path(root)

    def path(self, layer: str, dataset: str) -> Path:
        return self.root / layer / f"{dataset}.jsonl"

    def partition_path(self, layer: str, dataset: str, partition: str) -> Path:
        return self.root / layer / dataset / partition / self.PART_FILE

    def write_records(self, layer: str, dataset: str, records: Iterable[dict]) -> int:
        return _replace_file(self.path(layer, dataset), records)

    def merge_records(
        self, layer: str, dataset: str, key_field: str, records: Iterable[dict]
    ) -> int:
        return _merge_file(self.path(layer, dataset), key_field, records)

    def read_records(self, layer: str, dataset: str) -> list[dict]:
        records = _read_file(self.path(layer, dataset))
        for partition in self.partitions(layer, dataset):
            records.extend(self.read_partition(layer, dataset, partition))
        return records

    def partitions(self, layer: str, dataset: str) -> list[str]:
        base = self.root / layer / dataset
        if not base.is_dir():
            return []
        return sorted(str(found.parent.relative_to(base)) for found in base.rglob(self.PART_FILE))

    def read_partition(self, layer: str, dataset: str, partition: str) -> list[dict]:
        return _read_file(self.partition_path(layer, dataset, partition))

    def write_partition(
        self, layer: str, dataset: str, partition: str, records: Iterable[dict]
    ) -> int:
        target = self.partition_path(layer, dataset, partition)
        rows = list(records)
        if rows:
            return _replace_file(target, rows)
        target.unlink(missing_ok=True)
        return 0

    def merge_partition(
        self, layer: str, dataset: str, partition: str, key_field: str, records: Iterable[dict]
    ) -> int:
        return _merge_file(self.partition_path(layer, dataset, partition), key_field, records)

    def partition_flat(
        self, layer: str, dataset: str, partition_of: Callable[[dict], str | None]
    ) -> tuple[int, int]:
        flat = self.path(layer, dataset)
        grouped: dict[str, list[dict]] = {}
        dropped = 0
        for record in _read_file(flat):
            partition = partition_of(record)
            if partition is None:
                dropped += 1
            else:
                grouped.setdefault(partition, []).append(record)
        moved = 0
        for partition, rows in sorted(grouped.items()):
            existing = self.read_partition(layer, dataset, partition)
            present = {_canonical(r) for r in existing}
            fresh = [r for r in rows if _canonical(r) not in present]
            if fresh:
                self.write_partition(layer, dataset, partition, [*existing, *fresh])
            moved += len(rows)
        flat.unlink(missing_ok=True)
        return moved, dropped


def _canonical(record: dict) -> str:
    return json.dumps(record, ensure_ascii=False, sort_keys=True)


def _read_file(source: Path) -> list[dict]:
    if not source.exists():
        return []
    records: list[dict] = []
    with source.open(encoding="utf-8") as fh:
        for line in fh:
            line = line.strip()
            if line:
                records.append(json.loads(line))
    return records


def _replace_file(target: Path, records: Iterable[dict]) -> int:
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


def _merge_file(target: Path, key_field: str, records: Iterable[dict]) -> int:
    existing = {record[key_field] for record in _read_file(target)}
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


def open_store(root: Path | str) -> LakeStore:
    """Open the default (local FS) store at ``root``."""
    return LocalFsStore(root)
