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

import numpy as np
import pandas as pd
import matplotlib.pyplot as plt
import seaborn as sns
from absl import app, flags
import glob
import os

FLAGS = flags.FLAGS
flags.DEFINE_string('input_dir', default='/home/fede/projects/relco/data/prep/amazon/seccurvs', help='Dir with "outseccurv-*" files')


def main(_):
    files = glob.glob(os.path.join(FLAGS.input_dir, "outseccurv-*"))
    graphs = []
    allrel_curvs, norel_curvs = [], []
    for f in files:
        this_curvs = np.load(f)

        this_graph = f.split("-")[1]
        if not graphs or (graphs and graphs[-1] != this_graph):
            graphs += [this_graph] * len(this_curvs)

        rels = f.split("-")[-1].split(".")[0]
        if rels == "norel":
            norel_curvs.append(this_curvs)
        else:
            allrel_curvs.append(this_curvs)

    df = pd.DataFrame({
        "Graph": graphs,
        "norel": np.concatenate(norel_curvs, axis=0),
        "allrel": np.concatenate(allrel_curvs, axis=0)
    })
    df = df[["Graph", "norel", "allrel"]]
    dd = pd.melt(df, id_vars=['Graph'], value_vars=['norel', 'allrel'], var_name='Variants', value_name="SecCurv")
    plot = sns.boxplot(x='Graph', y='SecCurv', data=dd, hue='Variants')
    plot.get_figure().savefig("seccurv-boxplot.png")


if __name__ == '__main__':
    app.run(main)
