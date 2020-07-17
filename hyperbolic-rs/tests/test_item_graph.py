import unittest
import item_graph
import tensorflow as tf
import numpy as np


class TestItemGraph(unittest.TestCase):

    def test_build_graph_similarity_below_threshold(self):
        iids = ["a", "b", "c", "d", "e"]
        cossim_matrix = tf.zeros((len(iids), len(iids)), dtype=tf.float16)

        graph = item_graph.build_graph(iids, cossim_matrix, threshold=0.5, use_distance=False)

        self.assertEqual(len(graph), 0)

    def test_build_graph_use_distance(self):
        iids = ["a", "b", "c", "d", "e"]
        cossim_matrix = tf.ones((len(iids), len(iids)), dtype=tf.float16) * 0.7

        graph = item_graph.build_graph(iids, cossim_matrix, threshold=0.5, use_distance=True)

        self.assertGreater(len(graph), 0)
        for edge in graph.edges(data=True):
            self.assertAlmostEqual(edge[2]["weight"], 0.3, places=3)

    def test_build_graph_no_distance(self):
        iids = ["a", "b", "c", "d", "e"]
        cossim_matrix = tf.ones((len(iids), len(iids)), dtype=tf.float16) * 0.7

        graph = item_graph.build_graph(iids, cossim_matrix, threshold=0.5, use_distance=False)

        self.assertGreater(len(graph), 0)
        for edge in graph.edges(data=True):
            self.assertEqual(edge[2]["weight"], 1)

    def test_build_graph_only_two_nodes(self):
        iids = ["a", "b", "c", "d", "e"]
        cossim_matrix = np.ones((len(iids), len(iids))) * 0.3
        cossim_matrix[0, 1] = 1     # this represents (a, b)
        cossim_matrix[1, 0] = 1     # the matrix should be symmetric
        cossim_matrix = tf.convert_to_tensor(cossim_matrix, dtype=tf.float16)

        graph = item_graph.build_graph(iids, cossim_matrix, threshold=0.5, use_distance=False)

        self.assertEqual(len(graph), 2)
        for edge in graph.edges(data=True):
            self.assertEqual(edge[2]["weight"], 1)
        self.assertIn("a", graph.nodes())
        self.assertIn("b", graph.nodes())
