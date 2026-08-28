import { registerCommand } from "@vendetta/commands";
import { findByProps, findByStoreName } from "@vendetta/metro";

const UserStore = findByStoreName("UserStore");
const MessageActions = findByProps("sendMessage");

const unregisterFns = [];

function getAvatarUrl(userId, size) {
    const user = UserStore.getUser(userId);
    if (!user) return null;
    const ext = user.avatar?.startsWith("a_") ? "gif" : "png";
    return `https://cdn.discordapp.com/avatars/${user.id}/${user.avatar}.${ext}?size=${size ?? 512}`;
}

function getOptionValue(args, name) {
    return args.find((a) => a.name === name)?.value;
}

function sendPublic(ctx, content) {
    const channelId =
        ctx?.channel?.id ??
        findByStoreName("SelectedChannelStore")?.getChannelId?.();

    const formatted = `Self-bot\n>>> ${content}`;

    if (!channelId) {
        console.error("[FunCommands] Could not determine channel ID:", ctx);
        return;
    }

    if (!MessageActions?.sendMessage) {
        console.error("[FunCommands] sendMessage unavailable");
        return;
    }

    try {
        MessageActions.sendMessage(channelId, {
            content: formatted,
        });
    } catch (e) {
        console.error("[FunCommands] sendMessage threw:", e);
    }
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

function reg(command) {
    const unregister = registerCommand(command);
    if (typeof unregister === "function") {
        unregisterFns.push(unregister);
    }
}

export function onLoad() {
    reg({
        name: "avatar",
        description: "Show a user's avatar full size",
        options: [
            { name: "user", description: "Target user", type: 6, required: false },
        ],
        execute: (args, ctx) => {
            const userId = getOptionValue(args, "user") ?? ctx.user?.id ?? UserStore.getCurrentUser()?.id;
            const url = getAvatarUrl(userId, 1024);
            if (!url) return;
            sendPublic(ctx, url);
        },
    });

    reg({
        name: "roll",
        description: "Roll dice, e.g. 2d6+3",
        options: [
            { name: "dice", description: "Dice notation, e.g. 2d6+3", type: 3, required: true },
        ],
        execute: (args, ctx) => {
            const dice = getOptionValue(args, "dice");
            const result = rollDice(dice);
            if (!result) return;
            const rollsText = result.rolls.join(", ");
            const modText = result.mod ? ` (${result.mod > 0 ? "+" : ""}${result.mod})` : "";
            sendPublic(ctx, `Rolled [${rollsText}]${modText} = ${result.total}`);
        },
    });

    reg({
        name: "8ball",
        description: "Ask the magic 8-ball a question",
        options: [
            { name: "question", description: "Your question", type: 3, required: true },
        ],
        execute: (args, ctx) => {
            const question = getOptionValue(args, "question");
            const answer = EIGHTBALL_ANSWERS[Math.floor(Math.random() * EIGHTBALL_ANSWERS.length)];
            sendPublic(ctx, `${question} -> ${answer}`);
        },
    });

    reg({
        name: "coinflip",
        description: "Flip a coin",
        options: [],
        execute: (args, ctx) => {
            const result = Math.random() < 0.5 ? "Heads" : "Tails";
            sendPublic(ctx, result);
        },
    });

    reg({
        name: "color",
        description: "Generate a random hex color",
        options: [],
        execute: (args, ctx) => {
            sendPublic(ctx, randomHexColor());
        },
    });

    reg({
        name: "choose",
        description: "Randomly pick one option from a comma separated list",
        options: [
            { name: "options", description: "Comma separated list of options", type: 3, required: true },
        ],
        execute: (args, ctx) => {
            const raw = getOptionValue(args, "options");
            const options = raw.split(",").map((s) => s.trim()).filter(Boolean);
            if (options.length < 2) return;
            const pick = options[Math.floor(Math.random() * options.length)];
            sendPublic(ctx, pick);
        },
    });

    reg({
        name: "myid",
        description: "Show your own user ID",
        options: [],
        execute: (args, ctx) => {
            const id = UserStore.getCurrentUser()?.id;
            if (!id) return;
            sendPublic(ctx, id);
        },
    });

    reg({
        name: "timestamp",
        description: "Convert minutes from now into a Discord dynamic timestamp",
        options: [
            { name: "minutes", description: "Minutes from now", type: 4, required: true },
        ],
        execute: (args, ctx) => {
            const minutes = getOptionValue(args, "minutes");
            const target = Math.floor(Date.now() / 1000) + minutes * 60;
            sendPublic(ctx, `<t:${target}:R>`);
        },
    });

    reg({
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

            sendPublic(ctx, `Okay, reminding you in ${minutes} minute(s).`);

            setTimeout(() => {
                if (channelId && MessageActions?.sendMessage) {
                    MessageActions.sendMessage(channelId, {
                        content: `Self-bot\n>>> Reminder: ${text}`,
                    });
                }
            }, minutes * 60 * 1000);
        },
    });

    reg({
        name: "petpet",
        description: "Generate a petpet gif for a user",
        options: [
            { name: "user", description: "Target user", type: 6, required: false },
        ],
        execute: (args, ctx) => {
            const userId = getOptionValue(args, "user") ?? ctx.user?.id ?? UserStore.getCurrentUser()?.id;
            const avatarUrl = getAvatarUrl(userId, 256);
            if (!avatarUrl) return;
            const petpetUrl = `https://api.jeyy.xyz/v2/image/petpet?image_url=${encodeURIComponent(avatarUrl)}`;
            sendPublic(ctx, petpetUrl);
        },
    });

    reg({
        name: "triggered",
        description: "Generate a triggered gif for a user",
        options: [
            { name: "user", description: "Target user", type: 6, required: false },
        ],
        execute: (args, ctx) => {
            const userId = getOptionValue(args, "user") ?? ctx.user?.id ?? UserStore.getCurrentUser()?.id;
            const avatarUrl = getAvatarUrl(userId, 256);
            if (!avatarUrl) return;
            const triggeredUrl = `https://api.jeyy.xyz/v2/image/triggered?image_url=${encodeURIComponent(avatarUrl)}`;
            sendPublic(ctx, triggeredUrl);
        },
    });

    reg({
        name: "deepfry",
        description: "Deep fry a user's avatar",
        options: [
            { name: "user", description: "Target user", type: 6, required: false },
        ],
        execute: (args, ctx) => {
            const userId = getOptionValue(args, "user") ?? ctx.user?.id ?? UserStore.getCurrentUser()?.id;
            const avatarUrl = getAvatarUrl(userId, 256);
            if (!avatarUrl) return;
            const deepfryUrl = `https://api.jeyy.xyz/v2/image/deepfry?image_url=${encodeURIComponent(avatarUrl)}`;
            sendPublic(ctx, deepfryUrl);
        },
    });
}

export function onUnload() {
    while (unregisterFns.length) {
        const fn = unregisterFns.pop();
        try {
            fn();
        } catch (e) {
            console.error("[FunCommands] failed to unregister command:", e);
        }
    }
}

