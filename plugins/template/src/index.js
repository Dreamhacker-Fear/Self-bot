import { registerCommand } from "@vendetta/commands";
import { findByProps, findByStoreName } from "@vendetta/metro";

const UserStore = findByStoreName("UserStore");
const MessageActions = findByProps("sendMessage");

function getAvatarUrl(userId, size) {
    const user = UserStore.getUser(userId);
    if (!user) return null;
    const ext = user.avatar?.startsWith("a_") ? "gif" : "png";
    return `https://cdn.discordapp.com/avatars/${user.id}/${user.avatar}.${ext}?size=${size ?? 512}`;
}

function getOptionValue(args, name) {
    return args.find((a) => a.name === name)?.value;
}

const EIGHTBALL_ANSWERS = [
    "Yes.",
    "No.",
    "Maybe.",
    "Ask again later.",
    "Definitely.",
    "Absolutely not.",
    "Unclear, try again.",
    "It is certain.",
    "Very doubtful.",
];

function rollDice(input) {
    const match = /^(\d*)d(\d+)([+-]\d+)?$/i.exec(input.trim());
    if (!match) return null;
    const count = parseInt(match[1] || "1", 10);
    const sides = parseInt(match[2], 10);
    const mod = match[3] ? parseInt(match[3], 10) : 0;
    if (count < 1 || count > 100 || sides < 2) return null;

    let total = 0;
    const rolls = [];
    for (let i = 0; i < count; i++) {
        const r = Math.floor(Math.random() * sides) + 1;
        rolls.push(r);
        total += r;
    }
    total += mod;
    return { rolls, total, mod };
}

function randomHexColor() {
    const n = Math.floor(Math.random() * 0xffffff);
    return "#" + n.toString(16).padStart(6, "0").toUpperCase();
}

export function onLoad() {
    registerCommand({
        name: "avatar",
        description: "Show a user's avatar full size",
        options: [
            { name: "user", description: "Target user", type: 6, required: false },
        ],
        execute: (args, ctx) => {
            const userId = getOptionValue(args, "user") ?? ctx.user?.id ?? UserStore.getCurrentUser()?.id;
            const url = getAvatarUrl(userId, 1024);
            if (!url) return { content: "Could not find that user's avatar." };
            return { content: url };
        },
    });

    registerCommand({
        name: "roll",
        description: "Roll dice, e.g. 2d6+3",
        options: [
            { name: "dice", description: "Dice notation, e.g. 2d6+3", type: 3, required: true },
        ],
        execute: (args) => {
            const dice = getOptionValue(args, "dice");
            const result = rollDice(dice);
            if (!result) return { content: "Invalid dice format. Use something like 2d6+3." };
            const rollsText = result.rolls.join(", ");
            const modText = result.mod ? ` (${result.mod > 0 ? "+" : ""}${result.mod})` : "";
            return { content: `Rolled [${rollsText}]${modText} = ${result.total}` };
        },
    });

    registerCommand({
        name: "8ball",
        description: "Ask the magic 8-ball a question",
        options: [
            { name: "question", description: "Your question", type: 3, required: true },
        ],
        execute: () => {
            const answer = EIGHTBALL_ANSWERS[Math.floor(Math.random() * EIGHTBALL_ANSWERS.length)];
            return { content: answer };
        },
    });

    registerCommand({
        name: "coinflip",
        description: "Flip a coin",
        options: [],
        execute: () => {
            const result = Math.random() < 0.5 ? "Heads" : "Tails";
            return { content: result };
        },
    });

    registerCommand({
        name: "color",
        description: "Generate a random hex color",
        options: [],
        execute: () => {
            const hex = randomHexColor();
            return { content: hex };
        },
    });

    registerCommand({
        name: "choose",
        description: "Randomly pick one option from a comma separated list",
        options: [
            { name: "options", description: "Comma separated list of options", type: 3, required: true },
        ],
        execute: (args) => {
            const raw = getOptionValue(args, "options");
            const options = raw.split(",").map((s) => s.trim()).filter(Boolean);
            if (options.length < 2) return { content: "Give at least two options separated by commas." };
            const pick = options[Math.floor(Math.random() * options.length)];
            return { content: pick };
        },
    });

    registerCommand({
        name: "myid",
        description: "Show your own user ID",
        options: [],
        execute: () => {
            const id = UserStore.getCurrentUser()?.id;
            return { content: id ?? "Could not resolve your user ID." };
        },
    });

    registerCommand({
        name: "timestamp",
        description: "Convert minutes from now into a Discord dynamic timestamp",
        options: [
            { name: "minutes", description: "Minutes from now", type: 4, required: true },
        ],
        execute: (args) => {
            const minutes = getOptionValue(args, "minutes");
            const target = Math.floor(Date.now() / 1000) + minutes * 60;
            return { content: `<t:${target}:R>` };
        },
    });

    registerCommand({
        name: "remindme",
        description: "Get reminded after a number of minutes",
        options: [
            { name: "minutes", description: "Minutes from now", type: 4, required: true },
            { name: "text", description: "Reminder text", type: 3, required: true },
        ],
        execute: (args, ctx) => {
            const minutes = getOptionValue(args, "minutes");
            const text = getOptionValue(args, "text");
            const channelId = ctx.channel?.id;

            setTimeout(() => {
                if (channelId && MessageActions?.sendMessage) {
                    MessageActions.sendMessage(channelId, {
                        content: `Reminder: ${text}`,
                    });
                }
            }, minutes * 60 * 1000);

            return { content: `Okay, I will remind you in ${minutes} minute(s).` };
        },
    });

    registerCommand({
        name: "petpet",
        description: "Generate a petpet gif for a user",
        options: [
            { name: "user", description: "Target user", type: 6, required: false },
        ],
        execute: (args, ctx) => {
            const userId = getOptionValue(args, "user") ?? ctx.user?.id ?? UserStore.getCurrentUser()?.id;
            const avatarUrl = getAvatarUrl(userId, 256);
            if (!avatarUrl) return { content: "Could not find that user's avatar." };
            const petpetUrl = `https://api.jeyy.xyz/v2/image/petpet?image_url=${encodeURIComponent(avatarUrl)}`;
            return { content: petpetUrl };
        },
    });

    registerCommand({
        name: "triggered",
        description: "Generate a triggered gif for a user",
        options: [
            { name: "user", description: "Target user", type: 6, required: false },
        ],
        execute: (args, ctx) => {
            const userId = getOptionValue(args, "user") ?? ctx.user?.id ?? UserStore.getCurrentUser()?.id;
            const avatarUrl = getAvatarUrl(userId, 256);
            if (!avatarUrl) return { content: "Could not find that user's avatar." };
            const triggeredUrl = `https://api.jeyy.xyz/v2/image/triggered?image_url=${encodeURIComponent(avatarUrl)}`;
            return { content: triggeredUrl };
        },
    });

    registerCommand({
        name: "deepfry",
        description: "Deep fry a user's avatar",
        options: [
            { name: "user", description: "Target user", type: 6, required: false },
        ],
        execute: (args, ctx) => {
            const userId = getOptionValue(args, "user") ?? ctx.user?.id ?? UserStore.getCurrentUser()?.id;
            const avatarUrl = getAvatarUrl(userId, 256);
            if (!avatarUrl) return { content: "Could not find that user's avatar." };
            const deepfryUrl = `https://api.jeyy.xyz/v2/image/deepfry?image_url=${encodeURIComponent(avatarUrl)}`;
            return { content: deepfryUrl };
        },
    });
}

export function onUnload() {}
