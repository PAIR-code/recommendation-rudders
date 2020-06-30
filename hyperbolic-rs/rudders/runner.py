import time
import copy
import tensorflow as tf
from absl import logging
from pathlib import Path
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
        logging.info(f"Final performance after {epoch} epochs")
        self.compute_metrics(self.dev, "dev", epoch, write_summary=False)
        self.compute_metrics(self.test, "test", epoch, write_summary=False)

    def compute_metrics(self, split, title, epoch, write_summary=True):
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

        return metric_all, metric_random

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

    def reduce_lr(self):
        old_lr = float(tf.keras.backend.get_value(self.optimizer.lr))
        if old_lr > self.args.min_lr:
            new_lr = old_lr * self.args.lr_decay
            new_lr = max(new_lr, self.args.min_lr)
            tf.keras.backend.set_value(self.optimizer.lr, new_lr)
