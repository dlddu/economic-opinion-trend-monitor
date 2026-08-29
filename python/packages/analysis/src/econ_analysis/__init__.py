"""Analysis batch — LLM enrichment of Bronze into the Silver layer.

Two analyzers share the identical Silver output: a deterministic *fake* LLM
(keyword extraction, :mod:`econ_analysis.fake_llm`) and a *real* chat-completions
analyzer (:mod:`econ_analysis.llm`) that sends each item to a model over an injected
transport. Both keep the Bronze tracking key so Silver stays re-traceable and
re-processable (AC2.6). The fake analyzer is the default (offline, network-free); the
real one is opt-in via ``econ-analysis --analyzer llm`` (see README scope).
"""
