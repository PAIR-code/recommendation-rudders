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

import json
from pathlib import Path
from absl import app, flags, logging
import numpy as np
import tensorflow as tf
import pickle
from scipy import sparse
from rudders.config import CONFIG
from rudders.utils import set_seed, setup_logger
import rudders.models as models
import rudders.losses as losses
from rudders.runner import Runner

flag_fns = {
    'string': flags.DEFINE_string,
    'integer': flags.DEFINE_integer,
    'boolean': flags.DEFINE_boolean,
    'float': flags.DEFINE_float,
}
for dtype, flag_fn in flag_fns.items():
    for arg, (description, default) in CONFIG[dtype].items():
        flag_fn(arg, default=default, help=description)
FLAGS = flags.FLAGS


def get_models(n_users, n_items):
    tf.keras.backend.set_floatx(FLAGS.dtype)
    model = getattr(models, FLAGS.model)(n_users, n_items, FLAGS)
    model.build(input_shape=(1, 2))
    params = sum(np.prod(x.shape) for x in model.trainable_variables)
    logging.info(model.summary())
    logging.info(f'Total number of trainable parameters: {params}')
    return model


def load_data(prep_path, dataset_name, prep_name, debug):
    file_path = Path(prep_path) / dataset_name / f'{prep_name}.pickle'
    logging.info(f"Loading data from {file_path}")
    with tf.io.gfile.GFile(str(file_path), 'rb') as f:
        data = pickle.load(f)

    # splits
    train = data["train"] if not debug else data["train"][:1000].astype(np.int64)
    buffer_size = train.shape[0]
    train = tf.data.Dataset.from_tensor_slices(train)
    train.shuffle(buffer_size=buffer_size, reshuffle_each_iteration=True)
    dev = tf.data.Dataset.from_tensor_slices(data["dev"])
    test = tf.data.Dataset.from_tensor_slices(data["test"])

    # metadata
    samples = data["samples"]
    n_users = len(samples)
    all_items = set()
    for v in samples.values(): all_items.update(v)
    n_items = len(all_items)
    logging.info(f'Dataset stats: n_users: {n_users}, n_items: {n_items}')
    return train, dev, test, samples, n_users, n_items, data


def save_config(logs_dir, run_id):
    config_path = logs_dir / f'{run_id}.json'
    if FLAGS.save_logs and not config_path.exists():
        with tf.io.gfile.GFile(str(config_path), 'w') as fjson:
            json.dump(get_flags_dict(CONFIG), fjson)


def get_flags_dict(flags):
    """Maps FLAGS to dictionary in order to save it in json format."""
    config = {}
    for _, arg_dict in CONFIG.items():
        for arg, _ in arg_dict.items():
            config[arg] = getattr(flags, arg)
    return config


def get_optimizer(args):
    if args.optimizer == 'adagrad':
        return tf.keras.optimizers.Adagrad(learning_rate=args.lr, initial_accumulator_value=0.0, epsilon=1e-10)
    if args.optimizer == 'adam':
        return tf.keras.optimizers.Adam(learning_rate=args.lr, epsilon=1e-08)
    return getattr(tf.keras.optimizers, args.optimizer)(learning_rate=args.lr)


def main(_):
    set_seed(FLAGS.seed, set_tf_seed=FLAGS.debug)
    logs_dir = Path(FLAGS.logs_dir)
    setup_logger(FLAGS.print_logs, FLAGS.save_logs, logs_dir, FLAGS.run_id)
    tf.config.experimental_run_functions_eagerly(FLAGS.debug)

    logging.info(f"Flags/config of this run:\n{get_flags_dict(FLAGS)}")
    print("Num GPUs Available: ", len(tf.config.experimental.list_physical_devices('GPU')))

    # load data
    train, dev, test, samples, n_users, n_items, data = load_data(FLAGS.prep_dir, FLAGS.dataset, FLAGS.prep_name, 
                                                                  FLAGS.debug)

    item_item_distance_matrix = None
    if FLAGS.semantic_gamma > 0:    # if there is no semantic component in the loss it doesn't need to load the matrix
        item_item_distance_matrix = data["item_item_distance_matrix"]
        if sparse.issparse(item_item_distance_matrix):
            dense_matrix = item_item_distance_matrix.toarray()
            item_item_distance_matrix = np.where(dense_matrix != 0, dense_matrix, np.ones_like(dense_matrix) * -1)

    model = get_models(n_users, n_items)
    optimizer = get_optimizer(FLAGS)
    loss_fn = getattr(losses, FLAGS.loss_fn)(n_users, n_items, FLAGS, item_distances=item_item_distance_matrix)

    runner = Runner(FLAGS, model, optimizer, loss=loss_fn, train=train, dev=dev, test=test, samples=samples,
                    id2uid=data["id2uid"], id2iid=data["id2iid"], iid2name=data["iid2name"])
    runner.run()
    logging.info("Done!")


if __name__ == '__main__':
    app.run(main)
