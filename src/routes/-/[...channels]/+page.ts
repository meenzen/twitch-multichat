import TwitchChannel from "$lib/TwitchChannel";

export const ssr = false;

type ChannelData = {
    channels: string[];
}

const NO_DATA: ChannelData = {
    channels: [] as string[]
}

export function load({params}): ChannelData {
    let channelsString = params.channels;

    if (channelsString.trim().length === 0) {
        return NO_DATA;
    }
    
    const channels = channelsString.split("/");

    if (!TwitchChannel.isValidList(channels)) {
        return NO_DATA;
    }

    return {
        channels: channels,
    }
}