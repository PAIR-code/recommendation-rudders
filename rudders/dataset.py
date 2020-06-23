from pathlib import Path
import pickle as pkl

import numpy as np
import tensorflow as tf


class Dataset:

    def __init__(self, dataset_path: Path, debug: bool):
        """
        Creates CF dataset object for data loading.

        :param dataset_path: Path to directory containing preprocess data: train/dev/test pickle files
        :param debug: If true, the dataset will only contain 1000 examples for debugging.
        """
        self.dataset_path = dataset_path
        self.debug = debug
        self.data = {}
        for split in ['train', 'dev', 'test']:
            file_path = self.dataset_path / f'{split}.pickle'
            with tf.io.gfile.GFile(str(file_path), 'rb') as in_file:
                self.data[split] = pkl.load(in_file)

        with tf.io.gfile.GFile(str(self.dataset_path / 'samples.pickle'), 'rb') as samples_file:
            self.samples = pkl.load(samples_file)

        max_axis = np.max(np.concatenate((self.data['train'], self.data['valid'], self.data['test']), axis=0), axis=0)
        self.n_users = int(max_axis[0] + 1)
        self.n_items = int(max_axis[1] + 1)

    def get_samples(self):
        """Return filter dict to compute ranking metrics in the filtered setting."""
        return self.samples

    def get_split(self, split: str) -> tf.data.Dataset:
        split = self.data[split]
        if self.debug:
            split = split[:1000].astype(np.int64)
        tf_dataset = tf.data.Dataset.from_tensor_slices(split)
        if split == 'train':
            buffer_size = split.shape[0]
            tf_dataset.shuffle(buffer_size=buffer_size, reshuffle_each_iteration=True)
        return tf_dataset

    def get_shape(self):
        """Returns CF dataset shape."""
        return self.n_users, self.n_items
