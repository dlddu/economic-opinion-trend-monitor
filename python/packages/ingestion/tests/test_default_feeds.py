"""Feed cutover tests — the CLI now defaults to the real RSS/Atom source (offline).

These stay fully offline: they validate the checked-in default feed list and the
CLI's source/feeds defaults without performing any network fetch. The real feed
parse/normalize behavior (AC1.2–AC1.7) is covered by ``test_feeds.py``; here we
just assert the operational cutover — feed is the default source and a valid
default config resolves when ``--feeds`` is omitted.
"""

from econ_core.models import AXIS_VALUES
from econ_ingestion.cli import _build_parser
from econ_ingestion.feeds import FeedConfig, default_feeds_path, load_feed_configs


def test_cli_defaults_to_the_real_feed_source() -> None:
    # Operational cutover: bare invocation now collects from real feeds, not fake.
    args = _build_parser().parse_args([])
    assert args.source == "feed"
    assert args.feeds is None  # resolves to the packaged default at runtime


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

    # All three axes (KR/US/GLOBAL) represented so the monitor covers each one.
    assert {c.axis for c in configs} == set(AXIS_VALUES)

    # source_ids are unique — the collection stats key failures/dupes by source.
    source_ids = [c.source_id for c in configs]
    assert len(source_ids) == len(set(source_ids))
