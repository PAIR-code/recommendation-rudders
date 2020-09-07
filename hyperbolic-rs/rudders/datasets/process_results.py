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
"""Script to process csv of results"""
import argparse
import pandas as pd
from pathlib import Path
RUN_ID = "run_id"
HR_AT_10 = "HR@10_r"


if __name__ == '__main__':
    parser = argparse.ArgumentParser(description="process_results.py")
    parser.add_argument("--file", required=True, help="Path to model to load")
    args = parser.parse_args()

    data = pd.read_csv(args.file)

    # remove run_number from run
    data[RUN_ID] = data[RUN_ID].map(lambda x: x[:-2])

    grouped = data.groupby(RUN_ID)
    means = grouped.mean()
    stds = grouped.std().rename(lambda x: x + "_std", axis="columns")

    means_and_stds = means.join(stds)
    means_and_stds = means_and_stds.sort_values(by=[HR_AT_10], ascending=False)

    path = Path(args.file)
    new_path = path.parent / f"AA-{path.name[:-4]}.csv"
    means_and_stds.to_csv(str(new_path))
