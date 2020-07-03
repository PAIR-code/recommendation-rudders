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
import numpy as np
import random
from pathlib import Path
from rudders.datasets import movielens, keen
from rudders.config import CONFIG
from rudders.utils import set_seed

FLAGS = flags.FLAGS
flags.DEFINE_string('run_id', default='prep', help='Name of prep to store')
flags.DEFINE_string('dataset_path', default='data/keen', help='Path to raw dataset: data/keen, data/gem or data/ml-1m')
flags.DEFINE_boolean('plot_graph', default=True, help='Plots the user-item graph')
flags.DEFINE_integer('seed', default=42, help='Random seed')


def map_item_ids_to_sequential_ids(samples):
    """
    For each unique user or item id, this function creates a mapping to a sequence of number starting in 0.
    This will be the index of the embeddings in the model.

    :param samples: dict of <user_id1>: [<item_id1>, <item_id2>, ...]
    :return: dicts of {<user_idX>: indexY} and {<item_idX>: indexW}
    """
    uid2id, iid2id = {}, {}
    for uid, ints in samples.items():
        if uid not in uid2id:
            uid2id[uid] = len(uid2id)
        for iid in ints:
            if iid not in iid2id:
                iid2id[iid] = len(iid2id)

    return uid2id, iid2id


def create_splits(samples, do_random=False):
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
    for uid, items in samples.items():
        if do_random:
            random.shuffle(items)
        if len(items) >= 3:
            test.append([uid, items[-1]])
            dev.append([uid, items[-2]])
            for iid in items[:-2]:
                train.append([uid, iid])
        else:
            for iid in items:
                train.append([uid, iid])

    return {
        'samples': samples,
        'train': np.array(train).astype('int64'),
        'dev': np.array(dev).astype('int64'),
        'test': np.array(test).astype('int64')
    }


def save_as_pickle(dst_dir, run_id, data):
    """
    Saves data to train, dev, test and samples pickle files.

    :param dst_dir: String path saving directory.
    :param run_id: name of file to save
    :param data: Data to store
    """
    save_path = Path(dst_dir / f'{run_id}.pickle')
    with open(str(save_path), 'wb') as fp:
        pickle.dump(data, fp)


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


def main(_):
    set_seed(FLAGS.seed, set_tf_seed=True)
    dataset_path = Path(FLAGS.dataset_path)
    if "keen" in FLAGS.dataset_path:
        samples = keen.load_interactions_to_dict(dataset_path, min_interactions=4)
        iid2name = keen.build_iid2title(item_id_key="keen_id", item_title_key="keen_title")
    elif "gem" in FLAGS.dataset_path:
        samples = keen.load_interactions_to_dict(dataset_path, min_interactions=10)
        iid2name = keen.build_iid2title(item_id_key="gem_id", item_title_key="gem_link_title")
    else:
        samples = movielens.movielens_to_dict(dataset_path)
        iid2name = movielens.build_movieid2title(dataset_path)

    if FLAGS.plot_graph:
        plot_graph(samples)
        return

    uid2id, iid2id = map_item_ids_to_sequential_ids(samples)

    id_samples = {}
    for uid, ints in samples.items():
        id_samples[uid2id[uid]] = [iid2id[iid] for iid in ints]

    splits = create_splits(id_samples)
    splits["iid2name"] = iid2name
    splits["id2uid"] = {v: k for k, v in uid2id.items()}
    splits["id2iid"] = {v: k for k, v in iid2id.items()}

    # creates directories to save preprocessed data
    prep_path = Path(CONFIG["string"]["prep_dir"][1])
    prep_path.mkdir(parents=True, exist_ok=True)
    to_save_dir = prep_path / FLAGS.dataset_path.split("/")[-1]
    to_save_dir.mkdir(parents=True, exist_ok=True)
    save_as_pickle(to_save_dir, FLAGS.run_id, splits)


if __name__ == '__main__':
    app.run(main)
