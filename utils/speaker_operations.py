def replace_speakers(content, speaker_0):
    if speaker_0 == 'H':
        return content.replace('SPEAKER_00', 'H').replace('SPEAKER_01', 'W')
    elif speaker_0 == 'W':
        return content.replace('SPEAKER_00', 'W').replace('SPEAKER_01', 'H')
    else:
        return content