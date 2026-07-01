"""econ_core — shared domain, generated data-lake models, and storage abstraction.

Imported by the ingestion / analysis / aggregation batch packages. The
``econ_core.models`` subpackage is generated from ``contracts/`` by
``make gen`` — do not edit it by hand.
"""

from econ_core.storage import LakeStore, LocalFsStore, open_store

__all__ = ["LakeStore", "LocalFsStore", "open_store"]
