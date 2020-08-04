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

from absl import app, flags
import pickle
import tensorflow as tf
import numpy as np
import random
from scipy import sparse
from pathlib import Path
from rudders.datasets import movielens, keen, amazon
from rudders.config import CONFIG
from rudders.utils import set_seed, sort_items_by_popularity, save_as_pickle

FLAGS = flags.FLAGS
flags.DEFINE_string('run_id', default='multi-prep-notitle-hopdist0.55', help='Name of prep to store')
flags.DEFINE_string('item', default='ml-1m', help='Item can be "keen" (user-keen interactions), '
                                                          '"gem" (keen-gem interactions), "ml-1m", '
                                                          '"amzn-musicins", "amzn-vgames"')
flags.DEFINE_string('dataset_path', default='data/ml-1m', help='Path to raw dataset: data/keen, data/ml-1m, '
                                                               'data/amazon')
flags.DEFINE_string('item_item_file', default='data/prep/ml-1m/item_item_notitle_hop_distance_th0.55.pickle',
                    help='Path to the item-item distance file')
flags.DEFINE_boolean('plot_graph', default=False, help='Plots the user-item graph')
flags.DEFINE_boolean('shuffle', default=False, help='Shuffle the samples')
flags.DEFINE_boolean('sparse', default=False, help='Stores item-item matrix as a sparse matrix')
flags.DEFINE_integer('min_user_interactions', default=5, help='Users with less than this interactions are filtered')
flags.DEFINE_integer('min_item_interactions', default=2, help='Items with less than this interactions are filtered')
flags.DEFINE_integer('max_item_interactions', default=150, help='Items with more than this interactions are filtered')
flags.DEFINE_integer('seed', default=42, help='Random seed')
flags.DEFINE_integer('filter_most_popular', default=-1,
                     help='Filters out most popular items. If -1 it does not filter')
flags.DEFINE_float('min_matrix_distance', default=0.1, help='Minimum distance allowed in distance matrix. Values below'
                                                            'this threshold will be clamped to min_distance')


def map_raw_ids_to_sequential_ids(samples):
    """
    For each unique user or item id, this function creates a mapping to a sequence of number starting in 0.
    This will be the index of the embeddings in the model.

    Items ids will be from 0 to n_items - 1.
    Users ids will be from n_items to n_items + n_users - 1
    This condition is required to later build the distance matrix

    :param samples: dict of <user_id1>: [<item_id1>, <item_id2>, ...]
    :return: dicts of {<user_idX>: indexY} and {<item_idX>: indexW}
    """
    uid2id, iid2id = {}, {}
    sorted_samples = sorted(samples.items(), key=lambda x: x[0])
    # first sets items ids only
    for _, ints in sorted_samples:
        sorted_ints = sorted(ints)
        for iid in sorted_ints:
            if iid not in iid2id:
                iid2id[iid] = len(iid2id)
    # users ids come after item ids
    for uid, _ in sorted_samples:
        if uid not in uid2id:
            uid2id[uid] = len(uid2id) + len(iid2id)

    return uid2id, iid2id


def create_splits(samples, do_random=False, seed=42):
    """
    Splits (user, item) dataset to train, dev and test.

    :param samples: Dict of sorted examples.
    :param do_random: Bool whether to extract dev and test by random sampling. If False, dev, test are the last two
        items per user.
    :return: examples: Dictionary with 'train','dev','test' splits as numpy arrays
        containing corresponding (user_id, item_id) pairs, and 'to_skip' to a Dictionary containing filters
        for each user.
    """
    train, dev, test = [], [], []
    for uid, ints in samples.items():
        if do_random:
            random.seed(seed)
            random.shuffle(ints)
        if len(ints) >= 3:
            test.append([uid, ints[-1]])
            dev.append([uid, ints[-2]])
            for iid in ints[:-2]:
                train.append([uid, iid])
        else:
            for iid in ints:
                train.append([uid, iid])

    return {
        'samples': samples,
        'train': np.array(train).astype('int64'),
        'dev': np.array(dev).astype('int64'),
        'test': np.array(test).astype('int64')
    }


def plot_graph(samples):
    """Plot user-item graph, setting different colors for items and users."""
    import networkx as nx
    import matplotlib.pyplot as plt

    graph = nx.Graph()
    for uid, ints in samples.items():
        for iid in ints:
            graph.add_edge(uid, iid)

    color_map = ["red" if node in samples else "blue" for node in graph]
    fig = plt.figure()
    pos = nx.spring_layout(graph, iterations=100)
    nx.draw(graph, pos, ax=fig.add_subplot(111), node_size=20, node_color=color_map)
    plt.show()


def load_item_item_distances(item_item_file_path):
    """Loads item-item distances that were precomputed with item_graph.py"""
    print(f"Loading data from {item_item_file_path}")
    with tf.io.gfile.GFile(str(item_item_file_path), 'rb') as f:
        data = pickle.load(f)
    return data["item_item_distances"]


def build_distance_matrix(item_item_distances_dict, iid2id, do_sparse=False, min_distance=0.1):
    """
    Build a distance matrix according to the graph distance between the items, stored in the item_item_distances_dict
    The order of the matrix is given by the ids in iid2id.
    This is, the distance between the item with numerical indexes i and j is in the position distance_matrix[i, j]

    The distance to unconnected nodes or the distance from a node to itself is 0 if the matrix is sparse, or -1
    if the matrix is dense.

    :param item_item_distances_dict: dictionary that has the precomputed distances between pairs of items,
    if there is a path between them in the semantic graph.
    :param iid2id: mapping of item id (unique alpha numeric value that identifies the item) and
    item index (0, 1, 2, ..)
    :param do_sparse: if True, the distance matrix is returned as a sparse matrix, else as a numpy array
    :param min_distance: minimum distance in the distance matrix. Values below will be clamped to min_distance.
    """
    if do_sparse:
        distance_matrix = np.zeros((len(iid2id), len(iid2id)))
    else:
        distance_matrix = np.ones((len(iid2id), len(iid2id))) * -1

    for src_iid, src_index in iid2id.items():
        if src_iid not in item_item_distances_dict:
            continue
        src_dist = item_item_distances_dict[src_iid]
        for dst_iid, distance in src_dist.items():
            if src_iid != dst_iid and dst_iid in iid2id:
                dst_index = iid2id[dst_iid]
                distance_matrix[src_index, dst_index] = max(distance, min_distance)
    if do_sparse:
        return sparse.csr_matrix(distance_matrix)
    return distance_matrix


def main(_):
    set_seed(FLAGS.seed, set_tf_seed=True)
    dataset_path = Path(FLAGS.dataset_path)
    if FLAGS.item == "keen":
        samples = keen.load_user_keen_interactions(dataset_path, min_user_ints=FLAGS.min_user_interactions,
                                                   min_item_ints=FLAGS.min_item_interactions,
                                                   max_item_ints=FLAGS.max_item_interactions)
        iid2name = keen.build_iid2title(item_id_key="keen_id", item_title_key="keen_title")
    elif FLAGS.item == "gem":
        samples = keen.load_keen_gems_interactions(dataset_path, min_keen_keen_edges=2, max_keen_keen_edges=1000,
                                                   min_overlapping_users=2,
                                                   min_keen_ints=FLAGS.min_user_interactions,
                                                   min_item_ints=FLAGS.min_item_interactions,
                                                   max_item_ints=FLAGS.max_item_interactions)
        iid2name = keen.build_iid2title(item_id_key="gem_id", item_title_key="gem_link_title")
    elif FLAGS.item == "ml-1m":
        samples = movielens.movielens_to_dict(dataset_path)
        iid2name = movielens.build_movieid2title(dataset_path)
    elif "amzn" in FLAGS.item:
        samples = amazon.load_interactions(dataset_path, FLAGS.item)
        iid2name = amazon.build_itemid2name(dataset_path, FLAGS.item)
    else:
        raise ValueError(f"Unknown item: {FLAGS.item}")

    if FLAGS.filter_most_popular > 0:
        print(f"Filtering {FLAGS.filter_most_popular} most popular items")
        sorted_items = sort_items_by_popularity(samples)
        iid_to_filter = set([iid for iid, _ in sorted_items[:FLAGS.filter_most_popular]])
        samples = {uid: list(set(ints) - iid_to_filter) for uid, ints in samples.items()}
        samples = {uid: ints for uid, ints in samples.items() if ints}

    if FLAGS.plot_graph:
        plot_graph(samples)
        return

    uid2id, iid2id = map_raw_ids_to_sequential_ids(samples)

    id_samples = {}
    for uid, ints in samples.items():
        if FLAGS.item == "keen" or FLAGS.item == "gem":
            ints = sorted(ints)
        id_samples[uid2id[uid]] = [iid2id[iid] for iid in ints]

    data = create_splits(id_samples, do_random=FLAGS.shuffle, seed=FLAGS.seed)
    data["iid2name"] = {iid: iid2name.get(iid, "None") for iid in iid2id}
    data["id2uid"] = {v: k for k, v in uid2id.items()}
    data["id2iid"] = {v: k for k, v in iid2id.items()}

    # if there is an item-item graph, we preprocess it
    if FLAGS.item_item_file:
        item_item_distances_dict = load_item_item_distances(FLAGS.item_item_file)
        item_item_distance_matrix = build_distance_matrix(item_item_distances_dict, iid2id, do_sparse=FLAGS.sparse,
                                                          min_distance=FLAGS.min_matrix_distance)
        data["item_item_distance_matrix"] = item_item_distance_matrix

    # creates directories to save preprocessed data
    prep_path = Path(CONFIG["string"]["prep_dir"][1])
    prep_path.mkdir(parents=True, exist_ok=True)
    to_save_dir = prep_path / FLAGS.dataset_path.split("/")[-1]
    to_save_dir.mkdir(parents=True, exist_ok=True)
    save_as_pickle(to_save_dir / f'{FLAGS.run_id}.pickle', data)


if __name__ == '__main__':
    app.run(main)
