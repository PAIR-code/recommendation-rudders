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
"""Script to export for visualization the learnt embeddings.
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
from rudders.math.hyperb import expmap0, hyp_distance_all_pairs
from rudders.models.euclidean import euclidean_distance
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
USER_KEY = "user_embeddings"
ITEM_KEY = "item_embeddings"


def main():
    parser = argparse.ArgumentParser(description="export.py")
    parser.add_argument("--model", required=True, help="Path to model to load")
    parser.add_argument("--prep", default="data/prep/keen/ukeen-minint5-random.pickle",
                        help="Path to prep file for id2title dict")
    parser.add_argument("--matplot", default=0, type=int,
                        help="If matplot=1 it exports a matplot image. If not, it exports the coords and metadata to"
                             "be plotted in projector.tensorflow.org")
    parser.add_argument("--hyperbolic", default=1, type=int,
                        help="Whether the points were trained in a hyperbolic space or not. If --hyperbolic=1, it "
                             "assumes points are in the tangent space and need to be projected.")
    parser.add_argument("--curvature", default=1, type=float, help="Curvature of hyperbolic space.")
    parser.add_argument("--debug", default=0, type=int, help="If debug is 1, uses only a few embeddings")

    EXPORT_PATH.mkdir(parents=True, exist_ok=True)
    args = parser.parse_args()
    model_data = h5py.File(args.model, "r")

    user_embeds = np.array(model_data[USER_KEY][USER_KEY]["embeddings:0"])
    item_embeds = np.array(model_data[ITEM_KEY][ITEM_KEY]["embeddings:0"])

    if args.debug == 1:
        user_embeds = user_embeds[:100]
        item_embeds = item_embeds[:100]

    if args.hyperbolic:
        user_embeds = to_hyperbolic(user_embeds, args.curvature)
        item_embeds = to_hyperbolic(item_embeds, args.curvature)

    user_embeds_2d, item_embeds_2d = project_to_2d(user_embeds, item_embeds, hyperbolic=args.hyperbolic == 1)

    if args.matplot == 1:
        plot(args.model, user_embeds_2d, item_embeds_2d)
        return

    closest_user_item = get_closest_points(user_embeds, item_embeds, hyperbolic=args.hyperbolic == 1, curvature=args.curvature, top_k=9)
    closest_item_item = get_closest_points(item_embeds, item_embeds, hyperbolic=args.hyperbolic == 1, curvature=args.curvature)[:, 1:]
    id2title, samples = load_id2title(args.prep)
    export_for_projector(args.model, user_embeds_2d, item_embeds_2d, id2title, samples, closest_user_item, closest_item_item)


def load_id2title(prep_path):
    print(f"Loading prep from {prep_path}")
    with tf.io.gfile.GFile(str(prep_path), 'rb') as f:
        data = pickle.load(f)
    id2iid, iid2name = data["id2iid"], data["iid2name"]
    return {item_idx: iid2name.get(iid, "None") for item_idx, iid in id2iid.items()}, data["samples"]


def to_hyperbolic(embeds, c_value):
    return expmap0(tf.convert_to_tensor(embeds), tf.convert_to_tensor([c_value], dtype=tf.float64)).numpy()


def export_for_projector(filename, user_embeds, item_embeds, id2title, samples, closest_user_item, closest_item_item):
    meta, coords = ["type\ttitle\tinteractions\tclosest"], []
    for i, embed in enumerate(user_embeds):
        coords.append("\t".join([str(x) for x in embed]))
        # interactions are the items that each user is interacting with
        # samples contain the ids of the items, and id2title the title of each item
        interactions = [id2title.get(item_id, "None").replace("\t", "") for item_id in samples[i]]
        interactions = "//".join(interactions)

        closests = [id2title.get(item_id, "None").replace("\t", "") for item_id in closest_user_item[i]]
        closests = "//".join(closests)

        meta.append(f"user\tu_{i + 1}\t{interactions}\t{closests}")

    for i, embed in enumerate(item_embeds):
        coords.append("\t".join([str(x) for x in embed]))
        title = id2title[i].replace("\t", "-")

        closests = [id2title[item_id].replace("\t", "") for item_id in closest_item_item[i]]
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
    :return:
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


if __name__ == "__main__":
    main()
