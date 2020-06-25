
import sys
from pathlib import Path
import logging as native_logging
from absl import logging, flags
import tensorflow as tf
import numpy as np
import random

FLAGS = flags.FLAGS


def set_seed(seed: int, set_tf_seed: bool):
    if seed < 1:
        seed = random.randint(1, 999999)
    random.seed(seed)
    np.random.seed(seed)
    if set_tf_seed:
        tf.random.set_seed(seed)


def setup_logger(print_logs: bool, save_logs: bool, save_path: Path, run_id: str):
    native_logging.root.removeHandler(logging._absl_handler)
    logging._warn_preinit_stderr = False
    formatter = native_logging.Formatter(fmt='%(asctime)s %(message)s', datefmt='%Y-%d-%m %H:%M:%S')
    handlers = []
    if save_logs:
        write_mode = 'a' if save_path.exists() else 'w'
        save_path.mkdir(parents=True, exist_ok=True)
        log_file = save_path / f"{run_id}.log"
        stream = tf.io.gfile.GFile(str(log_file), write_mode)
        log_handler = native_logging.StreamHandler(stream)
        print('Saving logs in {}'.format(save_path))
        handlers.append(log_handler)
    if print_logs or not save_logs:
        log_handler = native_logging.StreamHandler(sys.stdout)
        handlers.append(log_handler)
    logger = logging.get_absl_logger()
    logger.propagate = False
    for log_handler in handlers:
        log_handler.setFormatter(formatter)
        log_handler.setLevel(logging.INFO)
        logger.addHandler(log_handler)
    return logger


def setup_summary(save_path: Path):
    train_log_dir = save_path / 'train'
    dev_log_dir = save_path / 'dev'
    train_summary_writer = tf.summary.create_file_writer(str(train_log_dir))
    dev_summary_writer = tf.summary.create_file_writer(str(dev_log_dir))
    return train_summary_writer, dev_summary_writer


def rank_to_metric_dict(ranks):
    mean_rank = np.mean(ranks)
    mean_reciprocal_rank = np.mean(1. / ranks)
    metrics = {'MR': mean_rank, 'MRR': mean_reciprocal_rank}
    for k in (1, 3, 10):
        metrics[f'HR@{k}'] = np.mean(ranks <= k) * 100
    return metrics
