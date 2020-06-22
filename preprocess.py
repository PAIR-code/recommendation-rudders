from absl import app, flags
import pickle
import numpy as np
import tensorflow as tf
from pathlib import Path
from rudders import config

FLAGS = flags.FLAGS
flags.DEFINE_string(
    'dataset_path',
    default='data/ml-1m/ratings.dat',
    help='Path to raw dataset')


def movielens_to_dict(dataset_path):
    """
    Maps raw dataset file to a Dictonary.

    :param dataset_path: Path to file containing interactions in a format
        uid::iid::rate::time.
    :return: Dictionary containing users as keys, and a numpy array of items the user
      interacted with, sorted by the time of interaction.
    """
    samples = {}
    with tf.io.gfile.GFile(dataset_path, 'r') as lines:
        for line in lines:
            line = line.strip('\n').split('::')
            uid = int(line[0]) - 1
            iid = int(line[1]) - 1
            timestamp = int(line[3])
            if uid in samples:
                samples[uid].append((iid, timestamp))
            else:
                samples[uid] = [(iid, timestamp)]
    for uid in samples:
        sorted_items = sorted(samples[uid], key=lambda p: p[1])
        samples[uid] = np.array([pair[0] for pair in sorted_items]).astype('int64')
    return samples


def create_splits(samples, random=False):
    """
    Splits (user, item) dataset to train, dev and test.

    :param samples: Dict of sorted examples.
    :param random: Bool whether to extract dev and test by random sampling. If False, dev, test are the last two
        items per user.
    :return: examples: Dictionary with 'train','dev','test' splits as numpy arrays
        containing corresponding (user_id, item_id) pairs, and 'to_skip' to a Dictionary containing filters
        for each user.
    """
    train, dev, test = [], [], []
    for uid, items in samples.items():
        if random:
            np.random.shuffle(items)
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


def save_as_pickle(dst_dir, splits):
    """
    Saves data to train, dev, test and samples pickle files.

    :param dst_dir: String path saving directory.
    :param splits: Dictionary mapping splits 'train','dev','test' and 'samples' 
    """
    for key in ['train', 'dev', 'test', 'samples']:
        save_path = Path(dst_dir / f'{key}.pickle')
        with tf.io.gfile.GFile(str(save_path), 'wb') as fp:
            pickle.dump(splits[key], fp)


def main(_):
    dataset_path = FLAGS.dataset_path
    sorted_samples = movielens_to_dict(dataset_path)
    splits = create_splits(sorted_samples)

    # creates directories to save preprocessed data
    config.PREP_PATH.mkdir(parents=True, exist_ok=True)
    to_save_dir = config.PREP_PATH / dataset_path.split("/")[-2]
    to_save_dir.mkdir(parents=True, exist_ok=True)

    save_as_pickle(to_save_dir, splits)


if __name__ == '__main__':
    app.run(main)
