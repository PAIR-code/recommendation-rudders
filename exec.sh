#!/usr/bin/env bash

RUN_ID="hyper64"

eval "$(conda shell.bash hook)"
conda activate keen
python train.py \
        --debug=False \
        --run_id=$RUN_ID \
        --model=DistHyperbolic \
        --dims=64 \
        --loss_fn=PairwiseHingeLoss \
        --lr=1e-3 \
        --max_epochs=150 \
        --neg_sample_size=1 \

