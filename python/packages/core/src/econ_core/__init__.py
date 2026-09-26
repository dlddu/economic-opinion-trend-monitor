"""econ_core — shared domain, generated data-lake models, and storage abstraction."""

from econ_core.storage import LakeStore, LocalFsStore, open_store

__all__ = ["LakeStore", "LocalFsStore", "open_store"]
