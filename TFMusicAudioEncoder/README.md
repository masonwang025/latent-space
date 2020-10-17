# TFMusicAudioEncoder

## Setup
1. Run `pip3 install -r requirements.txt`.
2. Create empty folders named 'audio_wav' and 'output'
3. Download `audio.zip` from https://zenodo.org/record/1101082#.X2XJrJNKjeS, unzip it, and add the folder to the repo.
4. Open up your terminal within the folder and run `python3 encoder.py`

## Tips
- If you're only looking at a single batch of songs, it'd be wise to move the
```ch1_song, ch2_song, sample_rate = next_batch(i, batch_size, sess)```
call outside of the training loops. This way it's only called once.

- If you find yourself running out of memory too quickly, reduce the songs_per_batch, and the node sizes for the input layers.
