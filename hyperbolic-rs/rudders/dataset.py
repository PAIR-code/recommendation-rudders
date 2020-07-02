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

        max_axis = np.max(np.concatenate((self.data['train'], self.data['dev'], self.data['test']), axis=0), axis=0)
        self.n_users = int(max_axis[0] + 1)
        self.n_items = int(max_axis[1] + 1)

    def get_samples(self):
        """Return filter dict to compute ranking metrics in the filtered setting."""
        return self.samples

    def get_split(self, split_name: str) -> tf.data.Dataset:
        split = self.data[split_name]
        if self.debug:
            split = split[:1000].astype(np.int64)
        tf_dataset = tf.data.Dataset.from_tensor_slices(split)
        if split_name == 'train':
            buffer_size = split.shape[0]
            tf_dataset.shuffle(buffer_size=buffer_size, reshuffle_each_iteration=True)
        return tf_dataset

    def get_shape(self):
        """Returns CF dataset shape."""
        return self.n_users, self.n_items
