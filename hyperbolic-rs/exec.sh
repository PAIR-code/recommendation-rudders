#!/usr/bin/env bash

RUN_ID="hyper32-bs2k-margin2-curv0p5"

eval "$(conda shell.bash hook)"
conda activate keen
python train.py \
        --debug=False \
        --run_id=$RUN_ID \
        --model=DistHyperbolic \
        --dims=32 \
        --loss_fn=PairwiseHingeLoss \
        --lr=1e-3 \
        --max_epochs=1000 \
        --neg_sample_size=1 \
        --margin=2 \
        --batch_size=2048 \
        --neg_sample_size=1 \
        --patience=10 \
        --validate=10 \
        --curvature=0.5 \
        --train_c=False \

