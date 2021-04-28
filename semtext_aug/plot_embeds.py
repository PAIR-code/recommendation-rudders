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
"""Script to export for visualization or plot the learnt embeddings.
This file takes as input the .h5 output of a trained model. It applies a
dimensionality reduction technique to 2D in either Euclidean or Hyperbolic
Space. Finally it plots the embeddings using matplotlib or it exports
the coordinates of the embeddings in the appropriate format to visualize
them with https://projector.tensorflow.org/"""

import argparse
from pathlib import Path
import h5py
import tensorflow as tf
import pickle
import numba
import numpy as np
from collections import namedtuple
import rudders.models as models
from rudders.math.hyperb import expmap0, hyp_distance_all_pairs
from rudders.math.euclid import euclidean_distance
import os
import matplotlib as mpl
if os.environ.get('DISPLAY') is None:  # NOQA
    mpl.use('Agg')  # NOQA
import matplotlib.pyplot as plt
import umap
from sklearn.preprocessing import StandardScaler
import seaborn as sns
sns.set()

EXPORT_PATH = Path("out")
ENTITY_KEY = "entity_embeddings"
RELATION_KEY = "relation_embeddings"


def load_prep(prep_path):
    print(f"Loading prep from {prep_path}")
    with tf.io.gfile.GFile(str(prep_path), 'rb') as f:
        return pickle.load(f)


def load_id2title(prep_data):
    """
    Loads a dictionary of {id: title}
    In the preprocessing data "id2iid" maps item indexes in the model to their original item_id
    on the dataset, and "iid2name" maps origina item_ids to the name that appears on the metadata

    :param prep_data: it is the dictionary with the preprocessing data used to generate the ckpt being processed
    """
    id2iid, iid2name = prep_data["id2iid"], prep_data["iid2name"]
    return {item_idx: iid2name.get(iid, "None") for item_idx, iid in id2iid.items()}, prep_data["samples"]


def to_hyperbolic(embeds, c_value):
    return expmap0(tf.convert_to_tensor(embeds), tf.convert_to_tensor([c_value], dtype=tf.float64)).numpy()


def export_for_projector(filename, user_embeds, item_embeds, id2title, samples, closest_user_item, closest_item_item,
                         user_ids, item_ids):
    """
    Exports coordinates and metadata of points in tsv following the guidelines to be plotted on
    the Tensorflow embedding projector.

    :param filename: to export the final files of coords and metadata
    :param user_embeds, item_embeds: 2D embeddings
    :param id2title: item id to title.
    :param samples: To know with which items the user is interacting.
    :param closest_user_item, closest_item_item: to be added as metadata
    :param user_ids, item_ids: aligned to the user/item embeds, to know to which entity we refer
    """
    meta, coords = ["type\ttitle\tinteractions\tclosest"], []
    for i, embed in enumerate(user_embeds):
        user_id = user_ids[i]
        coords.append("\t".join([str(x) for x in embed]))
        # interactions are the items that each user is interacting with
        # samples contain the ids of the items, and id2title the title of each item
        interactions = [id2title.get(item_id, "None").replace("\t", "") for item_id in samples[user_id]]
        interactions = "//".join(interactions)

        closests = [id2title.get(item_ids[neigh_id], "None").replace("\t", "") for neigh_id in closest_user_item[i]]
        closests = "//".join(closests)

        meta.append(f"user\tu_{user_id}\t{interactions}\t{closests}")

    for i, embed in enumerate(item_embeds):
        item_id = item_ids[i]
        coords.append("\t".join([str(x) for x in embed]))
        title = id2title[item_id].replace("\t", "-")

        closests = [id2title[item_ids[neig_id]].replace("\t", "") for neig_id in closest_item_item[i]]
        closests = "//".join(closests)

        meta.append(f"item\t{title}\t-\t{closests}")

    model_name = filename.split("/")[-1]
    coord_path = EXPORT_PATH / f"{model_name}-coords.tsv"
    meta_path = EXPORT_PATH / f"{model_name}-meta.tsv"
    write_file(coord_path, coords)
    write_file(meta_path, meta)


def write_file(path, data):
    with open(path, "w") as f:
        f.write("\n".join(data))


def project_to_2d(user_embeds, item_embeds, hyperbolic=True, scale=False, n_neighbors=5, min_dist=0.1):
    """
    For the Euclidean projection we just use UMAP to project Euclidean points into a 2D Euclidean space and plot them.
    For the hyperbolic projection:
    PRE: embeddings are already lying in the Poincare ball (exp_map was already applied)
    1 - UMAP computes distances between points using hyperbolic distance
    2 - UMAP uses as output metric the hyperboloid model of hyperbolic space
    3 - We map the points from the hyperboloid into the Poincare ball again to plot them
    """
    embeds = np.concatenate((np.array(user_embeds), np.array(item_embeds)), axis=0)

    if scale:
        print(f"Scaling data")
        embeds = StandardScaler().fit_transform(embeds)

    metric = output_metric = 'euclidean'
    if hyperbolic:
        metric = hyperbolic_distance
        output_metric = 'hyperboloid'

    umap_mapper = umap.UMAP(n_neighbors=n_neighbors, min_dist=min_dist, n_components=2, metric=metric,
                            output_metric=output_metric)
    print(f"Calculating projection of {len(embeds)} points ")
    proj_embeds = umap_mapper.fit_transform(embeds)

    x = proj_embeds[:, 0]
    y = proj_embeds[:, 1]

    if hyperbolic:
        # converting points from hyperboloid to poincare ball
        # see https://umap-learn.readthedocs.io/en/latest/embedding_space.html?#bonus-embedding-in-hyperbolic-space
        z = np.sqrt(1 + np.sum(proj_embeds ** 2, axis=1))
        x = x / (1 + z)
        y = y / (1 + z)

    split = len(user_embeds)
    concat = lambda a, b: np.concatenate((np.reshape(a, (-1, 1)), np.reshape(b, (-1, 1))), axis=-1)
    user_embeds = concat(x[:split], y[:split])
    item_embeds = concat(x[split:], y[split:])
    return user_embeds, item_embeds


def plot(filename, user_embeds, item_embeds, subsample=0.5, alpha=0.75, size=2):
    """
    :param filename: to store the image
    :param user_embeds: Numpy array of shape (len(user_embeds), 2)
    :param item_embeds: Numpy array of shape (len(item_embeds), 2)
    :param subsample: value in the range of [0, 1]. Proportion of users/items to export.
    If subsample == 0 or subsample == 1, it will use all users/items
    :param alpha: alpha parameter in scatter plot. Alpha of points to plot.
    :param size: size of each point for scatter plot
    """
    if subsample > 0:
        user_embeds = user_embeds[:int(len(user_embeds) * subsample)]
        item_embeds = item_embeds[:int(len(item_embeds) * subsample)]

    print("Plotting...")
    plt.scatter(user_embeds[:, 0], user_embeds[:, 1], c="#ff3e0e", label="users", alpha=alpha, s=size)
    plt.scatter(item_embeds[:, 0], item_embeds[:, 1], c="#1f77b4", label="items", alpha=alpha, s=size)

    model_name = filename.split("/")[-1]
    plt.title(f'{model_name} projection')
    plt.legend()
    if os.environ.get('DISPLAY') is None:
        plt.savefig(EXPORT_PATH / f"{model_name}.png")
    else:
        plt.show()


@numba.njit()
def hyperbolic_distance(x, y):
    """Function used by UMAP to project the points.
    It can only use numpy methods that's why it is reimplemented here"""

    def artanh(x):
        eps = 1e-10
        return np.arctanh(np.minimum(np.maximum(x, -1 + eps), 1 - eps))

    # c is assumed to be 1
    MIN_NORM = 1e-15
    c = 1
    sqrt_c = 1
    x2 = np.sum(x * x, axis=-1)
    y2 = np.sum(y * y, axis=-1)
    xy = np.sum(x * y, axis=-1)
    c1 = 1 - 2 * c * xy + c * y2
    c2 = 1 - c * x2
    num = np.sqrt(c1**2 * x2 + c2**2 * y2 - (2 * c1 * c2) * xy)
    denom = 1 - 2 * c * xy + c**2 * x2 * y2
    pairwise_norm = num / np.maximum(denom, MIN_NORM)
    dist = artanh(sqrt_c * pairwise_norm)
    return 2 * dist / sqrt_c


def get_closest_points(src_embeds, dst_embeds, hyperbolic, curvature, top_k=15):
    src_embeds, dst_embeds = tf.convert_to_tensor(src_embeds), tf.convert_to_tensor(dst_embeds)
    if hyperbolic:
        distances = hyp_distance_all_pairs(src_embeds, dst_embeds, tf.convert_to_tensor([curvature], dtype=tf.float64))
    else:
        distances = euclidean_distance(src_embeds, dst_embeds, all_pairs=True)

    closest_indexes = tf.math.top_k(-distances, k=top_k + 1)[1]
    closest_indexes = closest_indexes.numpy()
    return closest_indexes


def load_model(ckpt_path, model_class, curvature, prep_data):
    """
    :param ckpt_path: path to h5 exported model after training 
    :param model_class: class name of the model
    :param curvature: hyperparameter used to train the model (in case it is a hyperbolic model)
    :param prep_data: prep_data used to train the model
    :return: an instance of 'model_class' with weights taken from the specified ckpt
    """
    model_data = h5py.File(ckpt_path, "r")
    n_entities = len(model_data[ENTITY_KEY][ENTITY_KEY]["embeddings:0"])
    n_relations = len(model_data[RELATION_KEY][RELATION_KEY]["embeddings:0"])
    dims = model_data[ENTITY_KEY][ENTITY_KEY]["embeddings:0"].shape[-1]

    Flags = namedtuple("Flags",
                       ['initializer', 'entity_init', 'relation_init', 'regularizer', 'dims', 'neg_sample_size',
                        'entity_reg', 'relation_reg', 'batch_size', 'curvature', 'train_c', 'dtype',
                        'ui_weight', 'train_ui_weight'])
    initializer = "GlorotNormal"
    regularizer = "l2"
    args = Flags(
        initializer=initializer,
        entity_init=initializer,
        relation_init=initializer,
        regularizer=regularizer,
        dims=dims,
        neg_sample_size=1,
        entity_reg=0,
        relation_reg=0,
        batch_size=1024,
        curvature=curvature,
        train_c=False,
        dtype='float64',
        ui_weight=0.75,
        train_ui_weight=False
    )

    tf.keras.backend.set_floatx(args.dtype)
    item_ids = list(prep_data["id2iid"].keys())
    model = getattr(models, model_class)(n_entities, n_relations, item_ids, args)
    model.build(input_shape=(1, 2))
    model.load_weights(ckpt_path)
    print(model.summary())
    return model


def get_embeds(model, prep_data, is_debug):
    """Computes embeddings by using the left and right hand side model representations.
    It uses users and items on the dev set.
    Returns the embeddings of users and items, and to which id they correspond to"""
    split = prep_data["dev"][:100] if is_debug else prep_data["dev"]
    bs = 100
    user_embeds, item_embeds = [], []
    user_ids, item_ids = [], []
    for input_tensor in tf.data.Dataset.from_tensor_slices(split).batch(bs):
        user_embeds.append(model.get_lhs(input_tensor))
        item_embeds.append(model.get_rhs(input_tensor))
        user_ids.extend(input_tensor[:, 0].numpy().tolist())
        item_ids.extend(input_tensor[:, -1].numpy().tolist())
    return tf.concat(user_embeds, axis=0).numpy(), tf.concat(item_embeds, axis=0).numpy(), user_ids, item_ids


def main():
    parser = argparse.ArgumentParser(description="plot_embeds.py")
    parser.add_argument("--ckpt_path", default="ckpt/fooh_10ep.h5", required=False, help="Path to h5 ckpt to load")
    parser.add_argument("--model_class", default="UserAttentiveHyperbolic", help="Name of model class to load")
    parser.add_argument("--prep", default="data/prep/amazon/musicins-top10.pickle",
                        help="Path to prep used in the training of this model")
    parser.add_argument("--matplot", default=0, type=int,
                        help="If matplot=1 it exports a matplot image. If not, it exports the coords and metadata to"
                             "be plotted in projector.tensorflow.org")
    parser.add_argument("--hyperbolic", default=1, type=int,
                        help="Whether the points are on a hyperbolic space or not, for the projection.")
    parser.add_argument("--curvature", default=1, type=float, help="Curvature of hyperbolic space.")
    parser.add_argument("--debug", default=1, type=int, help="If debug is 1, uses only a few embeddings")

    EXPORT_PATH.mkdir(parents=True, exist_ok=True)
    args = parser.parse_args()

    prep_data = load_prep(args.prep)
    model = load_model(args.ckpt_path, args.model_class, args.curvature, prep_data)

    user_embeds, item_embeds, user_ids, item_ids = get_embeds(model, prep_data, args.debug == 1)

    user_embeds_2d, item_embeds_2d = project_to_2d(user_embeds, item_embeds, hyperbolic=args.hyperbolic == 1)

    if args.matplot == 1:
        plot(args.ckpt_path, user_embeds_2d, item_embeds_2d)
        return

    closest_user_item = get_closest_points(user_embeds, item_embeds, hyperbolic=args.hyperbolic == 1, curvature=args.curvature, top_k=9)
    closest_item_item = get_closest_points(item_embeds, item_embeds, hyperbolic=args.hyperbolic == 1, curvature=args.curvature)[:, 1:]
    id2title, samples = load_id2title(prep_data)
    export_for_projector(args.ckpt_path, user_embeds_2d, item_embeds_2d, id2title, samples, closest_user_item,
                         closest_item_item, user_ids, item_ids)


if __name__ == "__main__":
    main()
