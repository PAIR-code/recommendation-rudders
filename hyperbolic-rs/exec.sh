#!/usr/bin/env bash

LOOPS=3
RUN_ID="keen-hyper32-semantic-ga1-th0p7-nei0p01"

eval "$(conda shell.bash hook)"
conda activate keen

for i in `seq 1 $LOOPS`
do
    python train.py \
            --dataset=keen \
            --prep_name=ukeen-minuser5-minkeen2-maxkeen150 \
            --model=DistHyperbolic \
            --dims=32 \
            --loss_fn=CompositeLoss \
            --distortion_gamma=-1.0 \
            --semantic_gamma=-1.0 \
            --neighbors=0.01 \
            --item_item_file=item_item_hop_distance_th0.55.pickle \
            --debug=False \
            --run_id=$RUN_ID-$i \
            --lr=1e-3 \
            --max_epochs=2000 \
            --neg_sample_size=1 \
            --margin=2 \
            --batch_size=2048 \
            --patience=10 \
            --validate=10 \
            --curvature=1.0 \
            --train_c=False
done
