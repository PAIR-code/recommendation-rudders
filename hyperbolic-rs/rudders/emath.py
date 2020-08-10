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
import tensorflow as tf


def euclidean_sq_distance(x, y, all_pairs=False):
    """
    Computes Euclidean squared distance.

    :param x: Tensor of size B1 x d
    :param y: Tensor of size (B1 x) B2 x d if rhs_dep_lhs = False (True)
    :param all_pairs: boolean indicating whether to compute pairwise distances from each x to all y's or not.
    If all_pairs = False, must have B1 == B2.
    :return: Tensor of size B1 x B2 if all_pairs=True, otherwise Tensor of size B1 x 1.
    """
    x2 = tf.math.reduce_sum(x * x, axis=-1, keepdims=True)
    y2 = tf.math.reduce_sum(y * y, axis=-1, keepdims=True)
    if all_pairs:
        y2 = tf.transpose(y2)
        xy = tf.linalg.matmul(x, y, transpose_b=True)
    else:
        xy = tf.math.reduce_sum(x * y, axis=-1, keepdims=True)
    return x2 + y2 - 2 * xy


def euclidean_distance(x, y, all_pairs=False):
    sq_dist = euclidean_sq_distance(x, y, all_pairs)
    return tf.math.sqrt(tf.maximum(sq_dist, tf.zeros_like(sq_dist)))


def apply_reflection(r, x):
    """
    Applies 2x2 reflections.

    :param r: Tensor of size B x d representing reflection parameters per example.
    :param x: Tensor of size B x d representing points to reflect.
    :return: Tensor of size B x s representing reflection of x by r.
    """
    batch_size = tf.shape(r)[0]
    givens = tf.reshape(r, (batch_size, -1, 2))
    givens = givens / tf.norm(givens, ord=2, axis=-1, keepdims=True)
    x = tf.reshape(x, (batch_size, -1, 2))
    x_ref = givens[:, :, 0:1] * tf.concat((x[:, :, 0:1], -x[:, :, :1]), axis=-1) + \
            givens[:, :, 1:] * tf.concat((x[:, :, 1:], x[:, :, 0:1]), axis=-1)
    return tf.reshape(x_ref, (batch_size, -1))


def apply_rotation(r, x):
    """
    Applies 2x2 rotations.

    :param r: Tensor of size B x d representing rotation parameters per example.
    :param x: Tensor of size B x d representing points to rotate.
    :return: Tensor of size B x s representing rotation of x by r.
    """
    batch_size = tf.shape(r)[0]
    givens = tf.reshape(r, (batch_size, -1, 2))
    givens = givens / tf.norm(givens, ord=2, axis=-1, keepdims=True)
    x = tf.reshape(x, (batch_size, -1, 2))
    x_rot = givens[:, :, 0:1] * x + givens[:, :, 1:] * tf.concat((-x[:, :, 1:], x[:, :, 0:1]), axis=-1)
    return tf.reshape(x_rot, (batch_size, -1))

