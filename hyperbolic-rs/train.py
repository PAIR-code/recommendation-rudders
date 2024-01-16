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
from rudders.relations import Relations
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


def get_model(n_entities, n_relations, id2iid):
    tf.keras.backend.set_floatx(FLAGS.dtype)
    item_ids = list(id2iid.keys())
    model = getattr(models, FLAGS.model)(n_entities, n_relations, item_ids, FLAGS)
    model.build(input_shape=(1, 2))
    params = sum(np.prod(x.shape) for x in model.trainable_variables)
    logging.info(model.summary())
    logging.info(f'Total number of trainable parameters: {params}')
    return model


def setup_relations(train, args):
    """
    Filters out relations of the train data according to args

    :param train: train split represented as a numpy array of train_len x 3 with (head, relation, tail)
    :param args: namespace with information about which relations should filter
    :return: filtered_train: numpy array of final_train_len x 3 only with allowed relations
            n_relations: amount of allowed relations
    """
    allowed_relations = {Relations.USER_ITEM.value}     # User Item is always required
    if args.use_semantic_relation:
        allowed_relations.add(Relations.SEM_LOW_SIM.value)
        allowed_relations.add(Relations.SEM_MEDIUM_SIM.value)
        allowed_relations.add(Relations.SEM_HIGH_SIM.value)
    if args.use_cobuy_relation:
        allowed_relations.add(Relations.COBUY.value)
    if args.use_coview_relation:
        allowed_relations.add(Relations.COVIEW.value)
    if args.use_category_relation:
        allowed_relations.add(Relations.CATEGORY.value)
    if args.use_brand_relation:
        allowed_relations.add(Relations.BRAND.value)
    filtered_train = [triplet for triplet in train if triplet[1] in allowed_relations]

    n_relations = max(allowed_relations) + 1
    if args.invert_relations:
        filtered_train += [(tail, rel + n_relations, head) for head, rel, tail in filtered_train]
        n_relations *= 2

    if args.unique_relation:
        filtered_train = [(head, Relations.USER_ITEM.value, tail) for head, relation, tail in filtered_train]
        n_relations = 1

    return np.array(filtered_train).astype(np.int64), n_relations


def build_cold_start_test_splits(samples, test, proportion=0.1):
    """
    :param samples: dict of u_id: ints
    :param test: list of [(uid, rel, iid)] test set
    :return:
    """
    # builds "ranking" of more and less active users
    user_ints = [(uid, len(ints)) for uid, ints in samples.items()]
    user_ints = sorted(user_ints, key=lambda t: t[1])
    n_to_keep = round(len(user_ints) * proportion)

    top_users = set([uid for uid, _ in user_ints[-n_to_keep:]])
    low_users = set([uid for uid, _ in user_ints[:n_to_keep]])

    top_test = [triplet for triplet in test if triplet[0] in top_users]
    low_test = [triplet for triplet in test if triplet[0] in low_users]

    return low_test, top_test


def load_data(args):
    file_path = Path(args.prep_dir) / args.dataset / f'{args.prep_name}.pickle'
    logging.info(f"Loading data from {file_path}")
    with tf.io.gfile.GFile(str(file_path), 'rb') as f:
        data = pickle.load(f)

    samples = data["samples"]

    # splits
    train = data["train"] if not args.debug else data["train"][:1000].astype(np.int64)
    train, n_relations = setup_relations(train, args)
    buffer_size = train.shape[0]
    train = tf.data.Dataset.from_tensor_slices(train)
    train.shuffle(buffer_size=buffer_size, reshuffle_each_iteration=True)
    dev = tf.data.Dataset.from_tensor_slices(data["dev"])
    test = tf.data.Dataset.from_tensor_slices(data["test"])
    low_test, top_test = build_cold_start_test_splits(samples, data["test"], proportion=args.cold_start_proportion)
    low_test = tf.data.Dataset.from_tensor_slices(low_test)
    top_test = tf.data.Dataset.from_tensor_slices(top_test)

    return train, dev, test, low_test, top_test, samples, n_relations, buffer_size, data


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


def get_quantities(data):
    n_users = len(data["id2uid"])
    n_items = len(data["id2iid"])
    n_entities = data["n_entities"]
    return n_users, n_items, n_entities


def main(_):
    set_seed(FLAGS.seed, set_tf_seed=FLAGS.debug)
    logs_dir = Path(FLAGS.logs_dir)
    setup_logger(FLAGS.print_logs, FLAGS.save_logs, logs_dir, FLAGS.run_id)
    tf.config.experimental_run_functions_eagerly(FLAGS.debug)

    logging.info(f"Flags/config of this run:\n{get_flags_dict(FLAGS)}")
    gpus = tf.config.experimental.list_physical_devices('GPU')
    logging.info(f"Num GPUs Available: {len(gpus)}")
    if len(gpus) > 1:
        try:    # Restrict TensorFlow to only use the first GPU
            logging.info(f"Setting GPU Index {FLAGS.gpu_index} only")
            tf.config.experimental.set_visible_devices(gpus[FLAGS.gpu_index], 'GPU')
        except RuntimeError as e:
            logging.info(e)     # Visible devices must be set before GPUs have been initialized

    # load data
    train, dev, test, low_test, top_test, samples, n_relations, train_len, data = load_data(FLAGS)
    n_users, n_items, n_entities = get_quantities(data)

    model = get_model(n_entities, n_relations, data["id2iid"])
    optimizer = get_optimizer(FLAGS)
    loss_fn = getattr(losses, FLAGS.loss_fn)(ini_neg_index=0, end_neg_index=n_entities - 1, args=FLAGS)
    logging.info(f"Train split size: {train_len}, relations: {n_relations}")

    runner = Runner(FLAGS, model, optimizer, loss=loss_fn, train=train, dev=dev, test=test, low_test=low_test,
                    top_test=top_test, samples=samples,
                    id2uid=data["id2uid"], id2iid=data["id2iid"], iid2name=data["iid2name"])
    runner.run()
    logging.info("Done!")


if __name__ == '__main__':
    app.run(main)
