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
from collections.abc import Iterable
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
        """Return every record in the dataset (empty list if it does not exist)."""
        raise NotImplementedError


class LocalFsStore(LakeStore):
    """Local-filesystem JSONL implementation rooted at ``<root>/<layer>/<dataset>.jsonl``."""

    def __init__(self, root: Path | str) -> None:
        self.root = Path(root)

    def path(self, layer: str, dataset: str) -> Path:
        return self.root / layer / f"{dataset}.jsonl"

    def write_records(self, layer: str, dataset: str, records: Iterable[dict]) -> int:
        # Written beside the target and renamed into place: a reader that opens
        # the dataset mid-write (the serving Pod reads Gold from this volume)
        # sees the previous complete file, never a truncated one.
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
