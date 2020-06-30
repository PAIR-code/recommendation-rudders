from absl import app, flags
import pickle
import json
import numpy as np
import random
import tensorflow as tf
from pathlib import Path
from rudders.config import CONFIG

FLAGS = flags.FLAGS
flags.DEFINE_string('dataset_path', default='data/gem', help='Path to raw dataset: data/keen, data/gem or data/ml-1m')
flags.DEFINE_boolean('plot_graph', default=True, help='Plots the user-item graph')


def movielens_to_dict(dataset_path):
    """
    Maps raw dataset file to a Dictonary.

    :param dataset_path: Path to file containing interactions in a format
        uid::iid::rate::time.
    :return: Dictionary containing users as keys, and a numpy array of items the user
      interacted with, sorted by the time of interaction.
    """
    filename = "ratings.dat"
    samples = {}
    with tf.io.gfile.GFile(str(Path(dataset_path) / filename), 'r') as lines:
        for line in lines:
            line = line.strip('\n').split('::')
            uid = line[0]
            iid = line[1]
            timestamp = int(line[3])
            if uid in samples:
                samples[uid].append((iid, timestamp))
            else:
                samples[uid] = [(iid, timestamp)]
    sorted_samples = {}
    for uid in samples:
        sorted_items = sorted(samples[uid], key=lambda p: p[1])
        sorted_samples[uid] = [pair[0] for pair in sorted_items]
    return sorted_samples


def build_movieid2title(dataset_path):
    filename = "movies.dat"
    movieid2title = {}
    with open(Path(dataset_path) / filename, "r", encoding="ISO-8859-1") as f:
        for line in f:
            line = line.strip("\n").split("::")
            movieid2title[line[0]] = line[1]
    return movieid2title


def csv_to_dict(file_path, min_interactions=10):
    """
    Maps raw csv interactions file to a Dictonary.

    :param dataset_path: Path to file containing interactions in a format
        user_id,keen_id
    :param min_interactions: users with less than min_interactions are discarded
    :return: Dictionary containing users as keys, and a numpy array of items the user
      interacted with, sorted by the time of interaction.
    """
    samples = {}
    with open(file_path, 'r') as f:
        next(f)
        for line in f:
            line = line.strip('\n').split(',')
            uid = line[0]
            iid = line[1]
            if uid in samples:
                samples[uid].add(iid)
            else:
                samples[uid] = {iid}

    all_items = set()
    for ints in samples.values(): all_items.update(ints)
    interactions = sum([len(v) for v in samples.values()])
    print(f"Processed users: {len(samples)}. Processed items: {len(all_items)}. Interactions: {interactions}")

    filtered_samples = {uid: ints for uid, ints in samples.items() if len(ints) >= min_interactions}

    filtered_items = set()
    for ints in filtered_samples.values(): filtered_items.update(ints)
    interactions = sum([len(v) for v in filtered_samples.values()])
    print(f"After filtering: users: {len(filtered_samples)}, items: {len(filtered_items)}, interactions: {interactions}")

    return filtered_samples


def build_iid2title(item_id_key, item_title_key):
    keen_metadata = "data/keen/keens_and_gems_25_june_2020.json"
    iid2title = {}
    with open(keen_metadata, "r") as f:
        for line in f:
            line = json.loads(line)
            if item_id_key in line and item_title_key in line:
                iid2title[line[item_id_key]] = line[item_title_key][1:-1]
    return iid2title


def map_item_ids_to_sequential_ids(samples):
    """
    :param samples: dict of <user_id>: [<item_id>, <item_id>, ...]
    :return:
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
        test.append([uid, items[-1]])
        dev.append([uid, items[-2]])
        for iid in items[:-2]:
            train.append([uid, iid])

    return {
        'samples': samples,
        'train': np.array(train).astype('int64'),
        'dev': np.array(dev).astype('int64'),
        'test': np.array(test).astype('int64')
    }


def save_as_pickle(dst_dir, data):
    """
    Saves data to train, dev, test and samples pickle files.

    :param dst_dir: String path saving directory.
    :param data: Data to store
    """
    save_path = Path(dst_dir / 'prep.pickle')
    with open(str(save_path), 'wb') as fp:
        pickle.dump(data, fp)


def plot_graph(samples):
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
    dataset_path = FLAGS.dataset_path
    if "keen" in dataset_path or "gem" in dataset_path:
        file_path = Path(dataset_path) / "interactions.csv"
        samples = csv_to_dict(file_path)
        if "keen" in dataset_path:
            iid2name = build_iid2title(item_id_key="keen_id", item_title_key="keen_title")
        else:
            iid2name = build_iid2title(item_id_key="gem_id", item_title_key="gem_link_title")
    else:
        samples = movielens_to_dict(dataset_path)
        iid2name = build_movieid2title(dataset_path)

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
    to_save_dir = prep_path / dataset_path.split("/")[-1]
    to_save_dir.mkdir(parents=True, exist_ok=True)
    save_as_pickle(to_save_dir, splits)


if __name__ == '__main__':
    app.run(main)
