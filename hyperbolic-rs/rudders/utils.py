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

import sys
from pathlib import Path
import logging as native_logging
from absl import logging
import tensorflow as tf
import numpy as np
import random
import pickle


def set_seed(seed: int, set_tf_seed: bool):
    if seed < 1:
        seed = random.randint(1, 999999)
    random.seed(seed)
    np.random.seed(seed)
    if set_tf_seed:
        tf.random.set_seed(seed)


def setup_logger(print_logs: bool, save_logs: bool, save_path: Path, run_id: str):
    native_logging.root.removeHandler(logging._absl_handler)
    logging._warn_preinit_stderr = False
    formatter = native_logging.Formatter(fmt='%(asctime)s %(message)s', datefmt='%Y-%d-%m %H:%M:%S')
    handlers = []
    if save_logs:
        write_mode = 'a' if save_path.exists() else 'w'
        save_path.mkdir(parents=True, exist_ok=True)
        log_file = save_path / f"{run_id}.log"
        stream = tf.io.gfile.GFile(str(log_file), write_mode)
        log_handler = native_logging.StreamHandler(stream)
        print('Saving logs in {}'.format(save_path))
        handlers.append(log_handler)
    if print_logs or not save_logs:
        log_handler = native_logging.StreamHandler(sys.stdout)
        handlers.append(log_handler)
    logger = logging.get_absl_logger()
    logger.propagate = False
    for log_handler in handlers:
        log_handler.setFormatter(formatter)
        log_handler.setLevel(logging.INFO)
        logger.addHandler(log_handler)
    return logger


def setup_summary(save_path: Path):
    train_log_dir = save_path / 'train'
    dev_log_dir = save_path / 'dev'
    train_summary_writer = tf.summary.create_file_writer(str(train_log_dir))
    dev_summary_writer = tf.summary.create_file_writer(str(dev_log_dir))
    return train_summary_writer, dev_summary_writer


def rank_to_metric_dict(ranks):
    """
    Computes metrics and returns them as dict
    :param ranks: Numpy array of shape (n_examples, ) containing the rank of each example in full
    :return:
    """
    mean_rank = np.mean(ranks)
    mean_reciprocal_rank = np.mean(1. / ranks)
    metrics = {'MR': mean_rank, 'MRR': mean_reciprocal_rank}
    for k in (1, 3, 10):
        less_or_equal_k = ranks <= k
        metrics[f'HR@{k}'] = np.mean(less_or_equal_k) * 100

        if k == 10:
            ndcg_at_k = 1 / np.log2(ranks + 1)
            ndcg_at_k = np.where(less_or_equal_k, ndcg_at_k, 0)
            metrics[f'NDCG@{k}'] = np.mean(ndcg_at_k)

    return metrics


def sort_items_by_popularity(samples):
    item_degree = {}
    for uid, ints in samples.items():
        for iid in ints:
            if iid in item_degree:
                item_degree[iid] += 1
            else:
                item_degree[iid] = 1
    return sorted(item_degree.items(), key=lambda item: item[1], reverse=True)


def save_as_pickle(save_path, data):
    """
    Saves data to train, dev, test and samples pickle files.

    :param save_path: path where to save data.
    :param data: Data to store
    """
    with open(str(save_path), 'wb') as fp:
        pickle.dump(data, fp)


def add_to_train_split(data, triplets):
    """
    Adds the given list of triplets to the training data.
    Modifies data in-place.
    Post-condition: train data has added triplets
    :param data: splits with train data
    :param triplets: list of triplets
    """
    train = data["train"]
    triplets = np.array(triplets).astype('int64')
    data["train"] = np.concatenate((train, triplets), axis=0)
