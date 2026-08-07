"""Ingestion batch — collects top-viewed news into the Bronze layer.

The operational default is the real RSS/Atom ``feed`` source (see
:mod:`econ_ingestion.feeds`), which fetches the configured endpoints and writes
observations (``news_item``) plus content-addressed bodies (``news_body``). A
deterministic ``fake`` catalog (:mod:`econ_ingestion.sources`) remains for the
offline cross-language smoke and unit tests. The cadence (AC1.1) is scheduled by
deployment — an Argo CronWorkflow in ``deploy/batch/`` — and the CLI stays a
one-cycle, idempotent trigger.
"""
