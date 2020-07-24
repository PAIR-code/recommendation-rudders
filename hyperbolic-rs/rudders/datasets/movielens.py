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
"""File with movie lens dataset specific functions"""

import tensorflow as tf
from pathlib import Path


def movielens_to_dict(dataset_path):
    """
    Maps raw dataset file to a Dictonary.

    :param dataset_path: Path to file containing interactions in a format
        uid::iid::rate::time.
    :return: Dictionary containing users as keys, and a numpy array of items the user
      interacted with, sorted by the time of interaction.
    """
    filename = "ratings.dat"
    samples = {}
    with tf.io.gfile.GFile(str(dataset_path / filename), 'r') as lines:
        for line in lines:
            line = line.strip('\n').split('::')
            uid = line[0]
            iid = line[1]
            timestamp = int(line[3])
            if uid in samples:
                samples[uid].append((iid, timestamp))
            else:
                samples[uid] = [(iid, timestamp)]
    sorted_samples = {}
    for uid in samples:
        sorted_items = sorted(samples[uid], key=lambda p: p[1])
        sorted_samples[uid] = [pair[0] for pair in sorted_items]
    return sorted_samples


def build_movieid2title(dataset_path):
    """Builds a mapping between item ids and the title of each item."""
    filename = "movies.dat"
    movieid2title = {}
    with open(dataset_path / filename, "r", encoding="ISO-8859-1") as f:
        for line in f:
            line = line.strip("\n").split("::")
            movieid2title[line[0]] = line[1]
    return movieid2title


def build_texts_from_movies(path_to_movie_dat):
    """
    Extracts genre text from movies.dat to create semantic embeddings

    :param path_to_movie_dat:
    :return: dict of text list keyed by movie_id
    """
    texts = {}
    with open(path_to_movie_dat, "r", encoding="ISO-8859-1") as f:
        for line in f:
            movie_id, title_and_year, genres = line.strip("\n").split("::")
            title = title_and_year[:-7]
            # year = title_and_year[-5:-1]
            sorted_genres = sorted(genres.split("|"))
            texts[movie_id] = [title] + sorted_genres
    return texts


