"""Run stress markers: pytest tests/test_stress.py -v -m stress (see test_malhar.py)."""

import pytest

pytestmark = pytest.mark.stress
