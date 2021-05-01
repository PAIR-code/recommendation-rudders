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
import os.path
import json

def movielens_to_dict(dataset_path):
    """
    Maps raw dataset file to a Dictonary.

    :param dataset_path: path str to file containing interactions in a format
        uid::iid::rate::time.
    :return: Dictionary containing users as keys, and a numpy array of items the user
      interacted with, sorted by the time of interaction.
    """
    filename = "ratings_with_imdb_id_no_gzip.jsonl"
    samples = {}
    with tf.io.gfile.GFile(os.path.join(dataset_path, filename),
                           mode="r") as lines:
        for line in lines:
            input = json.loads(line)
            uid = input['user_id']
            timestamp = input['timestamp']
            iid = input['imdb_id']
            if iid:
                if uid in samples:
                    samples[uid].append((iid, timestamp))
                else:
                    samples[uid] = [(iid, timestamp)]
    sorted_samples = {}
    for uid in samples:
        sorted_items = sorted(samples[uid], key=lambda p: p[1])
        sorted_samples[uid] = [pair[0] for pair in sorted_items]
    num_ratings = len(sorted_samples)
    return sorted_samples


def build_movieid2title(dataset_path):
    """Builds a mapping between item ids and the title of each item."""
    filename = "ratings_with_imdb_id_no_gzip.jsonl"
    movieid2title = {}
    with tf.io.gfile.GFile(os.path.join(dataset_path, filename), mode="r") as lines:
      for line in lines:
        input = json.loads(line)
        mid = input['imdb_id']
        name = input['name']
        movieid2title[mid] = name
    return movieid2title


def build_texts_from_movies(path_to_movie_dat):
    """
    Extracts genre text from movies.dat to create semantic embeddings

    :param path_to_movie_dat:
    :return: dict of text list keyed by movie_id
    """
    texts = {}
    with tf.io.gfile.GFile(path_to_movie_dat, mode="r", encoding="ISO-8859-1") as f:
        for line in f:
           input = json.loads(line)
           imdb_id = input['imdb_id']
           synopsis = input['plot_synopsis']
           texts[imdb_id] = [synopsis]
    return texts


