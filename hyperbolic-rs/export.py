import argparse
from pathlib import Path
import h5py
import tensorflow as tf
import pickle
import numba
import numpy as np
from rudders.hmath import expmap0, hyp_distance_all_pairs
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

    EXPORT_PATH.mkdir(parents=True, exist_ok=True)
    args = parser.parse_args()
    model_data = h5py.File(args.model, "r")

    user_embeds = np.array(model_data[USER_KEY][USER_KEY]["embeddings:0"])
    item_embeds = np.array(model_data[ITEM_KEY][ITEM_KEY]["embeddings:0"])

    if args.hyperbolic:
        user_embeds = to_hyperbolic(user_embeds, args.curvature)
        item_embeds = to_hyperbolic(item_embeds, args.curvature)

    user_embeds_2d, item_embeds_2d = project_to_2d(user_embeds, item_embeds, hyperbolic=args.hyperbolic == 1)

    if args.matplot == 1:
        plot(args.model, user_embeds_2d, item_embeds_2d)
        return

    closest_items = get_closest_items(item_embeds, hyperbolic=args.hyperbolic == 1, curvature=args.curvature)
    id2title, samples = load_id2title(args.prep)
    export_for_projector(args.model, user_embeds_2d, item_embeds_2d, id2title, samples, closest_items)


def load_id2title(prep_path):
    print(f"Loading prep from {prep_path}")
    with tf.io.gfile.GFile(str(prep_path), 'rb') as f:
        data = pickle.load(f)
    id2iid, iid2name = data["id2iid"], data["iid2name"]
    return {item_idx: iid2name[iid] for item_idx, iid in id2iid.items()}, data["samples"]


def to_hyperbolic(embeds, c_value):
    return expmap0(tf.convert_to_tensor(embeds), tf.convert_to_tensor([c_value], dtype=tf.float64)).numpy()


def export_for_projector(filename, user_embeds, item_embeds, id2title, samples, closest_items):
    meta, coords = ["type\ttitle\tinteractions"], []
    for i, embed in enumerate(user_embeds):
        coords.append("\t".join([str(x) for x in embed]))
        interactions = [id2title[item_id].replace("\t", "") for item_id in samples[i]]
        interactions = "//".join(interactions)
        meta.append(f"user\tu_{i + 1}\t{interactions}")

    for i, embed in enumerate(item_embeds):
        coords.append("\t".join([str(x) for x in embed]))
        title = id2title[i].replace("\t", "-")
        closests = [id2title[item_id].replace("\t", "") for item_id in closest_items[i]]
        closests = "//".join(closests)
        meta.append(f"item\t{title}\t{closests}")

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


def get_closest_items(item_embeds, hyperbolic, curvature, top_k=15):
    item_embeds = tf.convert_to_tensor(item_embeds)
    if hyperbolic:
        distances = hyp_distance_all_pairs(item_embeds, item_embeds, tf.convert_to_tensor([curvature], dtype=tf.float64))
    else:
        distances = euclidean_distance(item_embeds, item_embeds, all_pairs=True)

    closest_indexes = tf.math.top_k(-distances, k=top_k + 1)[1]
    closest_indexes = closest_indexes.numpy()[:, 1:]
    return closest_indexes


if __name__ == "__main__":
    main()
