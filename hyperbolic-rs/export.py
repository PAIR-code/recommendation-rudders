import argparse
from pathlib import Path
import h5py
import tensorflow as tf
import numba
import numpy as np
from rudders.hmath import expmap0
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
    parser.add_argument("--matplot", default=1, type=int,
                        help="If matplot=1 it exports a matplot image. If not, it exports the coords and metadata to"
                             "be plotted in projector.tensorflow.org")
    parser.add_argument("--hyperbolic", default=1, type=int,
                        help="Whether the points were trained in a hyperbolic space or not. If --hyperbolic=1, it "
                             "assumes points are in the tangent space and need to be projected.")

    EXPORT_PATH.mkdir(parents=True, exist_ok=True)
    args = parser.parse_args()
    model_data = h5py.File(args.model, "r")

    user_embeds = np.array(model_data[USER_KEY][USER_KEY]["embeddings:0"])
    item_embeds = np.array(model_data[ITEM_KEY][ITEM_KEY]["embeddings:0"])

    if args.hyperbolic:
        user_embeds = to_hyperbolic(user_embeds)
        item_embeds = to_hyperbolic(item_embeds)

    if args.matplot == 1:
        plot(args.model, user_embeds, item_embeds, hyperbolic=args.hyperbolic == 1)
        return

    export_for_projector(args.model, user_embeds, item_embeds)


def to_hyperbolic(embeds):
    return expmap0(tf.convert_to_tensor(embeds), tf.convert_to_tensor([1.0], dtype=tf.float64)).numpy()


def export_for_projector(filename, user_embeds, item_embeds):
    meta, coords = ["id\ttype"], []
    for name, embeddings in zip(["user", "item"], [user_embeds, item_embeds]):
        for i, embed in enumerate(embeddings):
            coords.append("\t".join([str(x) for x in embed]))
            meta.append(f"{i + 1}\t{name}")

    model_name = filename.split("/")[-1]
    coord_path = EXPORT_PATH / f"{model_name}-coords.tsv"
    meta_path = EXPORT_PATH / f"{model_name}-meta.tsv"
    write_file(coord_path, coords)
    write_file(meta_path, meta)


def write_file(path, data):
    with open(path, "w") as f:
        f.write("\n".join(data))


def plot(filename, user_embeds, item_embeds, subsample=0.5, scale=False, hyperbolic=True, n_neighbors=5,
         min_dist=0.1, alpha=0.75, size=2):
    """
    For the Euclidean projection we just use UMAP to project Euclidean points into a 2D Euclidean space and plot them.
    For the hyperbolic projection:
    PRE: embeddings are already lying in the Poincare ball (exp_map was already applied)
    1 - UMAP computes distances between points using hyperbolic distance
    2 - UMAP uses as output metric the hyperboloid model of hyperbolic space
    3 - We map the points from the hyperboloid into the Poincare ball again to plot them
    """
    if subsample > 0:
        user_embeds = user_embeds[:int(len(user_embeds) * subsample)]
        item_embeds = item_embeds[:int(len(item_embeds) * subsample)]
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

    print("Plotting...")
    split = len(user_embeds)
    plt.scatter(x[:split], y[:split], c="#ff3e0e", label="users", alpha=alpha, s=size)
    plt.scatter(x[split:], y[split:], c="#1f77b4", label="items", alpha=alpha, s=size)

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


if __name__ == "__main__":
    main()
