"""CLI source defaults and the packaged default feed list (offline)."""

from econ_core.models import AXIS_VALUES
from econ_ingestion.cli import _build_parser
from econ_ingestion.feeds import FeedConfig, default_feeds_path, load_feed_configs


def test_cli_defaults_to_the_real_feed_source() -> None:
    args = _build_parser().parse_args([])
    assert args.source == "feed"
    assert args.feeds is None


def test_fake_source_remains_available() -> None:
    args = _build_parser().parse_args(["--source", "fake"])
    assert args.source == "fake"


def test_packaged_default_feed_config_resolves_and_is_valid() -> None:
    path = default_feeds_path()
    assert path.exists(), f"packaged default feed list missing: {path}"

    configs = load_feed_configs(path)
    assert configs, "default feed list must not be empty"
    for c in configs:
        assert isinstance(c, FeedConfig)
        assert c.axis in AXIS_VALUES
        assert c.feed_url.startswith(("http://", "https://"))
        assert c.limit >= 1

    assert {c.axis for c in configs} == set(AXIS_VALUES)

    # source_ids are unique — the collection stats key failures/dupes by source.
    source_ids = [c.source_id for c in configs]
    assert len(source_ids) == len(set(source_ids))
