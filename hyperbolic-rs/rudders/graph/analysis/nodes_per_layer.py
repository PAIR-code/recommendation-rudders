import argparse
import logging
import os
import sys

import networkx as nx
import numpy as np

from graphembed.pyx import FastPrecision

from utils import np_output_filename

parser = argparse.ArgumentParser(description='Compute the nodes per layer.')
parser.add_argument('--input', type=str, required=True, help='The input graph.')
parser.add_argument('--force', action='store_true', help='Re-generate them.')
parser.add_argument(
        '--inherit_filename',
        action='store_true',
        help='Whether the file format of the degrees file should be inheritted '
        'from the input.')
args = parser.parse_args()

out_file = np_output_filename(args.input, 'layer-nodes', args.inherit_filename)
if os.path.isfile(out_file) and not args.force:
    logging.warning('The file already exists: %s', out_file)
    sys.exit(0)

g = nx.convert_node_labels_to_integers(nx.read_edgelist(args.input))
fp = FastPrecision(g)
np.save(out_file, fp.nodes_per_layer())
