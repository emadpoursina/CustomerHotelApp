"""Load hyphenated scripts (e.g. build-dashboard.py) as modules for unit tests."""
import importlib.util
import os

_SCRIPTS = os.path.abspath(os.path.join(os.path.dirname(__file__), os.pardir))


def load(name):
    path = os.path.join(_SCRIPTS, name + ".py")
    spec = importlib.util.spec_from_file_location(name.replace("-", "_"), path)
    module = importlib.util.module_from_spec(spec)
    spec.loader.exec_module(module)
    return module
