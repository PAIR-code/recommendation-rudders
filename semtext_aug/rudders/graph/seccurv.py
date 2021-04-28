# Copyright 2017 The Rudders Authors.
#
# Licensed under the Apache License, Version 2.0 (the "License");
# you may not use this file except in compliance with the License.
# You may obtain a copy of the License at
#
#      http://www.apache.org/licenses/LICENSE-2.0
#
# Unless required by applicable law or agreed to in writing, software
# distributed under the License is distributed on an "AS IS" BASIS,
# WITHOUT WARRANTIES OR CONDITIONS OF ANY KIND, either express or implied.
# See the License for the specific language governing permissions and
# limitations under the License.
"""Code adapted from https://github.com/dalab/matrix-manifolds/blob/master/analysis/seccurvs.py"""

import itertools
import multiprocessing
from tqdm import tqdm
import random
import ctypes
from absl import logging

import networkit as nk
import networkx as nx
import numpy as np
from rudders.graph.utils import get_largest_connected_component


def seccurv(g, min_num_nodes=100, sample_ratio=0.5, max_neigh_pairs=int(1e4),
            n_cpus=multiprocessing.cpu_count()):
    """
    Computes graph sectional curvatures

    :param g: networkx graph
    :param min_num_nodes: The minimum number of nodes in the largest connected component to keep.
    :param sample_ratio: The percentage of all nodes to use as reference nodes `a`.
    :param max_neigh_pairs: The maximum number of neighbor pairs to compute seccurvs for
    :param n_cpus: The number of CPUs used for parallelization.
    :return:
    """
    g = get_largest_connected_component(g)
    g = nx.convert_node_labels_to_integers(g)

    num_nodes = g.number_of_nodes()
    if num_nodes > min_num_nodes:
        logging.info(f"Largest connected component has {num_nodes} nodes")
    else:
        raise ValueError(f"min_num_nodes = {min_num_nodes} but largest connected component has {num_nodes} nodes")

    num_ref_nodes = int(sample_ratio * num_nodes)

    # compute the shortest paths
    logging.info("Building distance matrix")
    dists = build_distance_matrix(g)

    # sampling of nodes to compute curvature
    m_samples = random.sample(range(num_nodes), num_ref_nodes)

    # parallelize over nodes ``m``
    logging.info(f"Starting parallelization over {n_cpus} cpus...")
    pool = multiprocessing.Pool(n_cpus)
    curvatures = pool.starmap(compute_sectional_curvatures,
                              [(g, dists, num_ref_nodes, max_neigh_pairs, m) for m in m_samples])
    curvatures = list(itertools.chain(*curvatures))

    curv_mean = np.mean(curvatures)
    curv_std = np.std(curvatures)

    logging.info(f"Sectional curvature: {curv_mean:.2f} +- {curv_std:.2f}")
    return curvatures


def compute_sectional_curvatures(graph, dists, num_ref_nodes, max_neigh_pairs, m):
    """
    Computes sectional curvature by sampling triangles, as described in Gu et al.

    :param graph: original graph
    :param dists: matrix of distances
    :param num_ref_nodes: number of nodes to sample
    :param max_neigh_pairs: max number of neighbor pairs to consider
    :param m: key of current node to use
    :return: list of means of sectional curvatures
    """
    seccurvs = []
    num_nodes = graph.number_of_nodes()
    neighs = list(graph[m])
    n_neighs = len(neighs)
    neigh_pairs = [(neighs[i], neighs[j]) for i in range(n_neighs) for j in range(i + 1, n_neighs)]
    for b, c in random.sample(neigh_pairs, min(max_neigh_pairs, len(neigh_pairs))):
        xis = []
        for a in random.sample(range(num_nodes), num_ref_nodes):
            if a == m: continue
            xi = dists[a][m] ** 2 + dists[b][c] ** 2 / 4 - (dists[a][b] ** 2 + dists[a][c] ** 2) / 2
            xi_g = xi / dists[a][m] / 2
            xis.append(xi_g)

        seccurvs.append(np.mean(xis))

    return seccurvs


def build_distance_matrix(g):
    """Builds a distance matrix from the graph g as a numpy array"""
    gk = nk.nxadapter.nx2nk(g)
    shortest_paths = nk.distance.APSP(gk).run().getDistances()
    n_nodes = len(shortest_paths)
    shared_array_base = multiprocessing.Array(ctypes.c_float, n_nodes ** 2, lock=False)
    shared_array = np.ctypeslib.as_array(shared_array_base)
    shared_array = np.reshape(shared_array, (n_nodes, n_nodes))
    for i in tqdm(range(n_nodes), desc="copying_matrix"):
        for j in range(n_nodes):
            shared_array[i, j] = shortest_paths[i][j]

    return shared_array
    # return np.array(shortest_paths, dtype=np.float32)
    # n_nodes = g.number_of_nodes()
    # dists = {u: {} for u in range(n_nodes)}
    # for i, u in enumerate(g.nodes()):
    #     for j, v in enumerate(g.nodes()):
    #         dists[u][v] = int(shortest_paths[i][j])
    # return dists
