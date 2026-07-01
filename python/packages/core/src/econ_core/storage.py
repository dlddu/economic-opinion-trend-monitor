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
        target = self.path(layer, dataset)
        target.parent.mkdir(parents=True, exist_ok=True)
        count = 0
        with target.open("w", encoding="utf-8") as fh:
            for record in records:
                fh.write(json.dumps(record, ensure_ascii=False))
                fh.write("\n")
                count += 1
        return count

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
