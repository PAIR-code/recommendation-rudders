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

import time
import copy
import tensorflow as tf
from absl import logging
from pathlib import Path
import random
from rudders.utils import rank_to_metric_dict


class Runner:
    def __init__(self, args, model, optimizer, loss, train, dev, test, samples, id2uid, id2iid, iid2name):
        self.args = args
        self.model = model
        self.optimizer = optimizer
        self.loss_fn = loss
        self.train = train
        self.dev = dev
        self.test = test
        self.samples = samples
        self.id2uid = id2uid
        self.id2iid = id2iid
        self.iid2name = iid2name
        self.summary = tf.summary.create_file_writer(args.logs_dir + f"/summary/{args.run_id}")

    def run(self):
        best_hr_at_10 = best_epoch = early_stopping_counter = 0
        best_weights = None

        for epoch in range(1, self.args.max_epochs + 1):
            start = time.perf_counter()
            train_loss = self.train_epoch(self.train.batch(self.args.batch_size)).numpy().item()
            exec_time = time.perf_counter() - start

            logging.info(f'Epoch {epoch} | train loss: {train_loss:.4f} | total time: {int(exec_time)} secs')
            with self.summary.as_default():
                tf.summary.scalar('train/loss', train_loss, step=epoch)
                tf.summary.scalar('train/user_avg_norm', self.model.get_avg_norm("user"), step=epoch)
                tf.summary.scalar('train/item_avg_norm', self.model.get_avg_norm("item"), step=epoch)
                tf.summary.scalar('train/lr', float(tf.keras.backend.get_value(self.optimizer.lr)), step=epoch)
                if hasattr(self.model, 'c'):
                    tf.summary.scalar('train/curvature', self.model.get_c(), step=epoch)

            if epoch % self.args.validate == 0:
                dev_loss = self.validate()

                logging.info(f'Epoch {epoch} | average valid loss: {dev_loss:.4f}')
                with self.summary.as_default():
                    tf.summary.scalar('dev/loss', dev_loss, step=epoch)

                # compute validation metrics
                _, metric_random = self.compute_metrics(self.dev, "dev", epoch)

                # early stopping
                hr_at_10 = metric_random["HR@10"]
                if hr_at_10 > best_hr_at_10:
                    best_hr_at_10 = hr_at_10
                    early_stopping_counter = 0
                    best_epoch = epoch
                    best_weights = copy.copy(self.model.get_weights())
                else:
                    self.reduce_lr()
                    early_stopping_counter += 1
                    if early_stopping_counter == self.args.patience:
                        logging.info('Early stopping!!!')
                        break

        logging.info(f'Optimization finished\nEvaluating best model from epoch {best_epoch}')
        self.model.set_weights(best_weights)

        if self.args.save_model:
            self.model.save_weights(str(Path(self.args.ckpt_dir) / f'{self.args.run_id}_{best_epoch}ep.h5'))

        # validation metrics
        logging.info(f"Final best performance from {best_epoch} epochs")
        self.compute_metrics(self.dev, "dev", epoch, write_summary=False, print_samples=True)
        self.compute_metrics(self.test, "test", epoch, write_summary=False, print_samples=True)

    @tf.function
    def train_epoch(self, train_batch):
        total_loss = tf.keras.backend.constant(0.0)
        counter = tf.keras.backend.constant(0.0)
        for input_batch in train_batch:
            counter += 1.
            with tf.GradientTape() as tape:
                loss = self.loss_fn.calculate_loss(self.model, input_batch)

            gradients = tape.gradient(loss, self.model.trainable_variables)
            self.optimizer.apply_gradients(zip(gradients, self.model.trainable_variables))
            total_loss += loss
        return total_loss / counter

    def validate(self):
        dev_batch = self.dev.batch(self.args.batch_size)
        total_loss = 0.
        counter = 0
        for input_batch in dev_batch:
            counter += 1
            loss = self.loss_fn.calculate_loss(self.model, input_batch)
            total_loss += loss.numpy().item()

        return total_loss / counter

    def compute_metrics(self, split, title, epoch, write_summary=True, print_samples=False):
        random_items = 100
        rank_all, rank_random = self.model.random_eval(split, self.samples, num_rand=random_items)
        metric_all, metric_random = rank_to_metric_dict(rank_all), rank_to_metric_dict(rank_random)

        logging.info(f"Result at epoch {epoch} in {title.upper()}")
        logging.info(f"Random items {random_items}:" + " ".join((f"{k}: {v:.2f}" for k, v in metric_random.items())))
        logging.info("All items:" + " ".join((f"{k}: {v:.2f}" for k, v in metric_all.items())))

        if write_summary:
            with self.summary.as_default():
                for k, v in metric_random.items():
                    tf.summary.scalar(f"{k}_r", v, step=epoch)
                for k, v in metric_all.items():
                    tf.summary.scalar(k, v, step=epoch)

        if print_samples:
            self.print_samples()

        return metric_all, metric_random

    def print_samples(self, n_users=10, n_samples=5, k_closest=10):
        users = random.sample(list(self.samples.keys()), len(self.samples))[:n_users]
        user_tensor = tf.expand_dims(tf.convert_to_tensor(users), 1)
        input_tensor = tf.concat((user_tensor, tf.ones_like(user_tensor)), axis=1)
        scores = self.model(input_tensor, all_pairs=True)
        top_k = tf.math.top_k(scores, k=k_closest)[1].numpy()

        for i, user_index in enumerate(users):
            samples = self.samples[user_index]
            logging.info(f"User {user_index} - {self.id2uid[user_index]} total training samples: {len(samples)}")
            for item_index in samples[:-2][:n_samples]:
                logging.info(f"\t\t{item_index} - {self.get_item_name(item_index)}")
            
            logging.info(f"\tClosest {k_closest} items to user")
            for item_index in top_k[i]:
                if item_index == samples[-1]:
                    pos = "TEST"
                elif item_index == samples[-2]:
                    pos = "DEV"
                elif item_index in samples[:-2]:
                    pos = "TRAIN"
                else:
                    pos = "UNRELATED"
                logging.info(f"\t\t{item_index} - {self.get_item_name(item_index)} - {pos}")

    def get_item_name(self, item_index):
        iid = self.id2iid.get(item_index, "")
        return self.iid2name.get(iid, "NoName")

    def reduce_lr(self):
        old_lr = float(tf.keras.backend.get_value(self.optimizer.lr))
        if old_lr > self.args.min_lr:
            new_lr = old_lr * self.args.lr_decay
            new_lr = max(new_lr, self.args.min_lr)
            tf.keras.backend.set_value(self.optimizer.lr, new_lr)
