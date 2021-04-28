# Tuned Hyper-Parameters for model training

## Hyper-parameters format

```
$${MODEL}-$${ITEM}-bs$${BATCH}-lr$${LR}-neg$${NEG_SAM_SIZE}-allRel-$${RUN}
```

Key 
* `MODEL`: name of model: they follow the same names that in the paper, so if you have any doubts you can check the code or the original publication.
* `ITEM` refers to the branch of the amazon dataset: Musical_Instruments, Video_games or Arts_Crafts_and_Sewing
* `BATCH`: batch size: I explored 512, 1024 and 2048
* `LR`: learning rate: I explored 1e-3, 5e-4, 1e-4
* `NEG_SAM_SIZE`: number of negative samples. I tried different configurations, and 1 was good enough in most cases so I just kept that value for all models.
* `allRel` | `noRel`: whether we use all the relations or no extra relation (just user-item)

## The parameters

```
BPR-Musical_Instruments-bs1024-lr0.0001-neg1-noRel
BPR-Musical_Instruments-bs1024-lr0.0001-neg1-allRel
BPR-Video_Games-bs1024-lr0.0001-neg1-noRel
BPR-Video_Games-bs512-lr0.001-neg1-allRel
BPR-Arts_Crafts_and_Sewing-bs1024-lr0.0001-neg1-noRel
BPR-Arts_Crafts_and_Sewing-bs1024-lr0.001-neg1-allRel

TransE-Musical_Instruments-bs1024-lr0.001-neg1-allRel
TransE-Video_Games-bs1024-lr0.001-neg1-noRel
TransE-Arts_Crafts_and_Sewing-bs1024-lr0.0001-neg1-noRel

TransH-Musical_Instruments-bs256-lr0.0001-neg1-noRel
TransH-Musical_Instruments-bs512-lr0.0001-neg1-allRel
TransH-Video_Games-bs1024-lr0.001-neg1-noRel
TransH-Arts_Crafts_and_Sewing-bs1024-lr0.001-neg1-noRel

DistMul-Musical_Instruments-bs256-lr0.0001-neg1-noRel
DistMul-Musical_Instruments-bs512-lr0.0001-neg1-allRel
DistMul-Video_Games-bs1024-lr0.0001-neg1-noRel
DistMul-Video_Games-bs1024-lr0.0001-neg1-allRel
DistMul-Arts_Crafts_and_Sewing-bs512-lr0.0001-neg1-noRel
DistMul-Arts_Crafts_and_Sewing-bs1024-lr0.001-neg1-allRel

HyperML-Musical_Instruments-bs1024-lr0.0001-neg1-noRel
HyperML-Musical_Instruments-bs1024-lr0.0001-neg1-allRel
HyperML-Video_Games-bs1024-lr0.0001-neg1-noRel-BCE
HyperML-Video_Games-bs1024-lr0.0001-neg1-allRel
HyperML-Arts_Crafts_and_Sewing-bs512-lr0.0001-neg1-noRel-BCE
HyperML-Arts_Crafts_and_Sewing-bs512-lr0.0001-neg1-allRel

RotatE-Musical_Instruments-bs1024-lr0.0001-neg1-noRel
RotatE-Musical_Instruments-bs512-lr0.0001-neg1-allRel
RotatE-Video_Games-bs512-lr0.0001-neg1-noRel
RotatE-Video_Games-bs512-lr0.0001-neg1-allRel
RotatE-Arts_Crafts_and_Sewing-bs512-lr0.0001-neg1-noRel
RotatE-Arts_Crafts_and_Sewing-bs1024-lr0.001-neg1-allRel

RotRefEuclidean-Musical_Instruments-bs1024-lr0.0005-neg1-noRel
RotRefEuclidean-Musical_Instruments-bs512-lr0.0001-neg1-allRel
RotRefEuclidean-Musical_Instruments-bs1024-lr0.0001-neg1-allRel
RotRefEuclidean-Video_Games-bs1024-lr0.0005-neg1-allRel
RotRefEuclidean-Arts_Crafts_and_Sewing-bs1024-lr0.0001-neg1-noRel

RotRefHyperbolic-Musical_Instruments-bs2048-lr0.0005-neg1-allRel-1
RotRefHyperbolic-Video_Games-bs1024-lr0.0001-neg1-noRel
RotRefHyperbolic-Video_Games-bs1024-lr0.0001-neg1-allRel
RotRefHyperbolic-Arts_Crafts_and_Sewing-bs512-lr0.0005-neg1-noRel
RotRefHyperbolic-Arts_Crafts_and_Sewing-bs2048-lr0.0001-neg1-allRel

MuREuclidean-Musical_Instruments-bs512-lr0.0001-neg1-noRel
MuREuclidean-Musical_Instruments-bs512-lr0.0001-neg1-noRel
MuREuclidean-Musical_Instruments-bs512-lr0.0001-neg1-allRel
MuREuclidean-Arts_Crafts_and_Sewing-bs1024-lr0.0001-neg1-noRel

MuRHyperbolic-Musical_Instruments-bs2048-lr0.0001-neg1-noRel
MuRHyperbolic-Video_Games-bs1024-lr0.001-neg1-noRel
MuRHyperbolic-Video_Games-bs2048-lr0.0005-neg1-allRel
MuRHyperbolic-Arts_Crafts_and_Sewing-bs1024-lr0.0001-neg1-noRel
MuRHyperbolic-Arts_Crafts_and_Sewing-bs1024-lr0.0001-neg1-allRel
```
