"""TF-U02: Unit test for queue state transitions (spec 003, data-model.md §3)."""
import os
import sys
import unittest

HERE = os.path.dirname(os.path.abspath(__file__))
SCRIPTS = os.path.abspath(os.path.join(HERE, os.pardir))
if SCRIPTS not in sys.path:
    sys.path.insert(0, SCRIPTS)

from queue_state import transition, can_transition, InvalidTransitionError


class TestQueueState(unittest.TestCase):
    def test_pending_to_published(self):
        self.assertTrue(can_transition("pending", "publish"))
        self.assertEqual(transition("pending", "publish"), "published")

    def test_pending_to_private(self):
        self.assertTrue(can_transition("pending", "private"))
        self.assertEqual(transition("pending", "private"), "private")

    def test_published_to_private(self):
        self.assertTrue(can_transition("published", "private"))
        self.assertEqual(transition("published", "private"), "private")

    def test_private_to_private_noop(self):
        self.assertTrue(can_transition("private", "private"))
        self.assertEqual(transition("private", "private"), "private")

    def test_published_to_publish_rejected(self):
        self.assertFalse(can_transition("published", "publish"))
        with self.assertRaises(InvalidTransitionError) as cm:
            transition("published", "publish")
        self.assertEqual(cm.exception.code, "not_pending")

    def test_private_to_publish_rejected_terminal(self):
        self.assertFalse(can_transition("private", "publish"))
        with self.assertRaises(InvalidTransitionError) as cm:
            transition("private", "publish")
        self.assertEqual(cm.exception.code, "private_terminal")

    def test_invalid_state_or_action(self):
        with self.assertRaises(InvalidTransitionError):
            transition("unknown", "publish")
        with self.assertRaises(InvalidTransitionError):
            transition("pending", "delete")


if __name__ == "__main__":
    unittest.main()
