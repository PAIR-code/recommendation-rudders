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
from tqdm import tqdm
from pathlib import Path
from rudders.relations import Relations
from rudders.datasets import movielens, keen, amazon
from rudders.config import CONFIG
from rudders.utils import set_seed, sort_items_by_popularity, save_as_pickle, jaccard_similarity

FLAGS = flags.FLAGS
flags.DEFINE_string('run_id', default='musicins-top50', help='Name of prep to store')
flags.DEFINE_string('item', default='amzn-musicins', help='Item can be "keen" (user-keen interactions), '
                                                          '"gem" (keen-gem interactions), "ml-1m", '
                                                          '"amzn-musicins", "amzn-vgames"')
flags.DEFINE_string('dataset_path', default='data/amazon', help='Path to raw dataset: data/keen, data/ml-1m, '
                                                               'data/amazon')
flags.DEFINE_string('item_item_file', default='data/prep/amazon/musicins_musicins_cosine_distance_th0.6.pickle',
                    help='Path to the item-item distance file')
flags.DEFINE_boolean('plot_graph', default=False, help='Plots the user-item graph')
flags.DEFINE_boolean('shuffle', default=False, help='Whether to shuffle the interactions or not')
flags.DEFINE_boolean('add_extra_relations', default=True, help='For the amazon dataset, adds co-buy, co-view and'
                                                                'categorical similarity relations')
flags.DEFINE_integer('min_user_interactions', default=5, help='Users with less than this interactions are filtered')
flags.DEFINE_integer('min_item_interactions', default=2, help='Items with less than this interactions are filtered')
flags.DEFINE_integer('max_item_interactions', default=150, help='Items with more than this interactions are filtered')
flags.DEFINE_integer('similarity_items_per_item', default=50, help='Amount of similarity items to add per item')
flags.DEFINE_integer('seed', default=42, help='Random seed')
flags.DEFINE_integer('filter_most_popular', default=-1,
                     help='Filters out most popular items. If -1 it does not filter')


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


def create_splits(samples, relation_id, do_random=False, seed=42):
    """
    Splits (user, item) dataset to train, dev and test.

    :param samples: Dict of sorted examples.
    :param relation_id: number that identifies the user-item interaction relation to form the triplets
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
            test.append((uid, relation_id, ints[-1]))
            dev.append((uid, relation_id, ints[-2]))
            for iid in ints[:-2]:
                train.append((uid, relation_id, iid))
        else:
            for iid in ints:
                train.append((uid, relation_id, iid))
    return {
        'samples': samples,
        'train': np.array(train).astype('int64'),
        'dev': np.array(dev).astype('int64'),
        'test': np.array(test).astype('int64')
    }


def build_item_user_triplets(user_item_triplets):
    """Given user-item triplets it inverts them creating item-user triplets, using the same relation since we
    consider it symmetric"""
    return [(item_id, relation, user_id) for user_id, relation, item_id in user_item_triplets]


def load_item_item_distances(item_item_file_path):
    """Loads item-item distances that were precomputed with item_graph.py."""
    print(f"Loading data from {item_item_file_path}")
    with tf.io.gfile.GFile(str(item_item_file_path), 'rb') as f:
        data = pickle.load(f)
    return data["item_item_distances"]


def map_and_sort_distances(item_item_distances_dict, iid2id):
    """
    Sorts distances and returns them
    :param item_item_distances_dict: dict of src_iid: {dst_iid: distance} with graph distances
    :param iid2id: dict of iids
    :return: dict of iid: list of (iid, dist) ordered
    """
    sorted_dists = {}
    for src_iid, dists in item_item_distances_dict.items():
        if src_iid not in iid2id:
            continue
        dists = [(iid2id[dst_iid], d) for dst_iid, d in dists if dst_iid in iid2id]
        sorted_dists[iid2id[src_iid]] = sorted(dists, key=lambda t: t[1])
    return sorted_dists


def build_item_item_triplets(item_item_distances_dict, relation_id, top_k):
    """
    Builds item item triples from the sorted item-item distances

    :param item_item_distances_dict: dict of src_iid: [(dst_iid, distance)] sorted by distance
    :param relation_id: relation index
    :param top_k: adds closest top_k items per item
    :return:
    """
    triplets = set()
    for src_iid, dists in tqdm(item_item_distances_dict.items(), desc="item_item_triplets"):
        for dst_iid, _ in dists[:top_k]:
            triplets.add((src_iid, relation_id, dst_iid))
            triplets.add((dst_iid, relation_id, src_iid))
    return list(triplets)


def add_to_train_split(data, triplets):
    """
    Adds the given list of triplets to the training data
    :param data: splits with train data
    :param triplets: list of triplets
    """
    train = data["train"]
    triplets = np.array(triplets).astype('int64')
    data["train"] = np.concatenate((train, triplets), axis=0)


def get_co_triplets(item_metas, get_aspect_func, iid2id, relation_id):
    """
    Creates triplets based on co_buy or co_view relations taken from metadata
    :param item_metas: list of amazon metadata objects
    :param get_aspect_func: a function that extract either co_buy or co_view data
    :param iid2id: dict of item ids
    :param relation_id: relation index
    :return: list of triplets
    """
    triplets = set()
    for item in item_metas:
        head_id = iid2id[item.id]
        for co_rel_id in get_aspect_func(item):
            if co_rel_id in iid2id:
                tail_id = iid2id[co_rel_id]
                triplets.add((head_id, relation_id, tail_id))
                triplets.add((tail_id, relation_id, head_id))
    return list(triplets)


def get_category_triplets(item_metas, iid2id, relation_id, top_k=10, threshold=0.5):
    """
    Builds triplets based on categorical labels. It computes Jaccard similarity and if
    the similarity is above the threshold, it adds the triple

    :param item_metas: list of amazon metadata objects
    :param iid2id: dict of item ids
    :param relation_id: relation index
    :param top_k: tries to add only top_k items per item
    :param threshold: pairs with Jaccard similarity below threshold are discarded
    :return: list of triplets
    """
    triplets = set()
    for it_meta_a in tqdm(item_metas, desc="category_triplets"):
        sims = [(it_meta_b.id, jaccard_similarity(it_meta_a.categories, it_meta_b.categories))
                for it_meta_b in item_metas]
        sims = [(id_b, jac_sim) for id_b, jac_sim in sims if jac_sim >= threshold]
        sims = sorted(sims, key=lambda x: x[1], reverse=True)
        for it_meta_b_id, _ in sims[:top_k]:
            if it_meta_a.id == it_meta_b_id:
                continue
            head_id = iid2id[it_meta_a.id]
            tail_id = iid2id[it_meta_b_id]
            triplets.add((head_id, relation_id, tail_id))
            triplets.add((tail_id, relation_id, head_id))
    return list(triplets)


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

    data = create_splits(id_samples, Relations.USER_ITEM.value, do_random=FLAGS.shuffle, seed=FLAGS.seed)
    data["iid2name"] = {iid: iid2name.get(iid, "None") for iid in iid2id}
    data["id2uid"] = {v: k for k, v in uid2id.items()}
    data["id2iid"] = {v: k for k, v in iid2id.items()}
    print(f"User item interaction triplets: {len(data['train'])}")

    # inverts user-item relation
    item_user_triplets = build_item_user_triplets(data['train'])
    add_to_train_split(data, item_user_triplets)
    print(f"Added item-user triplets: {len(item_user_triplets)}")

    # if there is an item-item graph, we preprocess it
    if FLAGS.item_item_file:
        item_item_distances_dict = load_item_item_distances(FLAGS.item_item_file)
        item_item_distances_dict = map_and_sort_distances(item_item_distances_dict, iid2id)
        print("Creating semantic triplets")
        item_item_triplets = build_item_item_triplets(item_item_distances_dict, Relations.SEMANTIC.value,
                                                      FLAGS.similarity_items_per_item)
        add_to_train_split(data, item_item_triplets)
        print(f"Added item-item similarity triplets: {len(item_item_triplets)}")

    if "amzn" in FLAGS.item and FLAGS.add_extra_relations:
        print("Adding extra relations")
        item_metas = amazon.load_metadata(dataset_path, FLAGS.item)
        item_metas = [it_meta for it_meta in item_metas if it_meta.id in iid2id]

        # co buy relations
        cobuy_triplets = get_co_triplets(item_metas, lambda x: x.cobuys, iid2id, Relations.COBUY.value)
        add_to_train_split(data, cobuy_triplets)
        print(f"Added co-buy triplets: {len(cobuy_triplets)}")

        # co view relations
        coview_triplets = get_co_triplets(item_metas, lambda x: x.coviews, iid2id, Relations.COVIEW.value)
        add_to_train_split(data, coview_triplets)
        print(f"Added co-view triplets: {len(coview_triplets)}")

        # category relations
        category_triplets = get_category_triplets(item_metas, iid2id, Relations.CATEGORY.value,
                                                  top_k=FLAGS.similarity_items_per_item)
        add_to_train_split(data, category_triplets)
        print(f"Added categorical triplets: {len(category_triplets)}")

    # creates directories to save preprocessed data
    print(f"Final training split: {len(data['train'])} triplets")
    prep_path = Path(CONFIG["string"]["prep_dir"][1])
    prep_path.mkdir(parents=True, exist_ok=True)
    to_save_dir = prep_path / FLAGS.dataset_path.split("/")[-1]
    to_save_dir.mkdir(parents=True, exist_ok=True)
    save_as_pickle(to_save_dir / f'{FLAGS.run_id}.pickle', data)


if __name__ == '__main__':
    app.run(main)
