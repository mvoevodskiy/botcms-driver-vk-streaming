const { VK } = require('vk-io');
const { StreamingAPI } = require('@vk-io/streaming');

/** VK driver
 * @class
 *
 * @property {Object} defaults
 * @property {string} driverName
 * @property {string} name
 *
 * @property {BotCMS} BC
 * @property {VK} Transport
 */

class VKontakte {
    constructor (BC, params = {}) {
        this.MODES = {
            USER: 'user',
            GROUP: 'group',
        };
        this.BC = BC;
        this.defaults = {
            name: 'vkstreaming',
            driverName: 'vkstreaming',
            humanName: 'VKontakte Streaming API',
        };
        this.params = params;
        this._mode = params.mode || this.MODES.USER;
        this.ATTACHMENTS = {
            photo: this.BC.ATTACHMENTS.PHOTO,
            video: this.BC.ATTACHMENTS.VIDEO,
            audio: this.BC.ATTACHMENTS.AUDIO,
            wall: this.BC.ATTACHMENTS.POST,
            doc: this.BC.ATTACHMENTS.FILE,
            poll: this.BC.ATTACHMENTS.POLL,
        };
        this.ATTACHMENTS_FLIP = this.BC.T.flipObject(this.ATTACHMENTS);
        this.name = params.name || this.defaults.name;
        this.driverName = params.driverName || this.defaults.driverName;
        this.humanName = params.humanName || this.defaults.humanName;
        this._keywords = {};
        this.keywords = params.keywords || {};
        // console.log(params.keywords);
        // let sessionHandler = params.sessionHandler || this.defaults.sessionHandler;
        // let sessionParams = params.sessionParams || {};
        // sessionParams.getStorageKey = sessionParams.getStorageKey || (context => (String(context.peerId) + ':' + String(context.senderId)));
        params.authScope = params.authScope || this.defaults.authScope;
        // console.log('TG: ');
        // console.log(params);
        this.Transport = new VK(params);
        this.Transport.twoFactorHandler = params.twoFactorHandler;
        this.Streaming = new StreamingAPI(this.Transport);
        // this.Transport.updates.on('message', (new sessionHandler(sessionParams)).middleware);
    }

    get mode () {
        return this._mode;
    }

    get keywords () {
        return Object.values(this._keywords);
    }

    set keywords (keywords) {
        if (Array.isArray(keywords)) {
            for (let value of keywords) {
                let tag = this.BC.MT.md5(value)
                this._keywords[tag] = {tag, value: value.replace('.', '')};
            }
        } else {
            this._keywords = keywords;
        }
        // console.log(this._keywords);
    }

    isAvailable () {
        return typeof this.Transport === 'object';
    }

    /**
     * @param {VKontakte} t
     * @param {StreamingContext} ctx
     */
    async defaultCallback (t, ctx) {
        // if (ctx.payload.out === 1) {
        //     return;
        // }
        // await ctx.loadMessagePayload();
        console.log(ctx);
        // console.log(ctx.payload);

        /** @type {Context} **/
        let bcContext = new this.BC.config.classes.Context(this.BC, this, ctx);

        let chatType = '';
        switch (ctx.eventType) {
            case 'user':
                chatType = 'user';
                break;
            case 'chat':
                chatType = 'chat';
                break;
            default:
                chatType = ctx.eventType;
        }
        bcContext.Message.chat = {
            id: ctx.signerId ? ctx.signerId : ctx.authorId,
            type: chatType,
        };
        bcContext.Message.sender = {
            id: ctx.signerId ? ctx.signerId : (parseInt(ctx.authorId) > 0 ? ctx.authorId : null),
            isBot: false,
        };
        bcContext.Message.id = ctx.url.replace('https://vk.com/', '');
        bcContext.Message.date = ctx.actionAt;
        bcContext.Message.text = ctx.text || '';

        bcContext.Message.keywords = [];
        for (let tag of ctx.tags) {
            console.log('VK STREAMING. TAG', tag);
            if (tag in this._keywords) {
                console.log('VK STREAMING. TAG', tag, 'FOUND. VALUE', this._keywords[tag]);
                bcContext.Message.keywords.push(this._keywords[tag].value);
            }
        }


        // if (!this.BC.MT.empty(ctx.attachments)) {
        //     for (const attachment of ctx.attachments) {
        //
        //         let props = {
        //             type: attachment.type,
        //             owner: attachment.ownerId,
        //             name: String(attachment),
        //         };
        //
        //         if (attachment.type === 'photo') {
        //             let sizes = {};
        //
        //             for (const size of attachment.sizes) {
        //                 sizes[size.type] = size;
        //             }
        //             console.log(sizes);
        //             let photo = sizes.w || sizes.z || sizes.y || sizes.x || sizes.r || sizes.p;
        //             props.height = photo.height;
        //             props.wigth = photo.width;
        //             props.link = photo.url;
        //             props.type = this.BC.ATTACHMENTS.PHOTO;
        //         }
        //
        //         bcContext.Message.handleAttachment(props);
        //     }
        // }

        return t.BC.handleUpdate(bcContext);
    }

    listen () {
        this.Transport.updates.on('publication', (ctx) => {return this.defaultCallback(this, ctx)});
    }

    kbBuild (keyboard, recursive = false) {
        return [];
    }

    kbRemove (ctx) {
        return [];
    }

    async reply (ctx, parcel) {
        return [];
    }

    async send (parcel) {
        return [];
    }

    async fetchUserInfo (userId) {
        if (parseInt(userId) < 0) {
            return this.fetchChatInfo(userId);
        }
        let userInfo;
        let result;
        if (userId === this.BC.SELF_SEND || userId === 0 || userId === undefined) {
            userInfo = [[]];
        } else {
            let params = {
                fields: [
                    'screen_name',
                ],
                user_ids: [
                    userId
                ]
            };
            userInfo = await this.Transport.api.users.get(params);
            // if (!this.BC.MT.empty(userInfo) && !this.BC.MT.empty(userInfo[0])) {
            //     userInfo = userInfo[0];
            // }
        }
        result = {
            id: userInfo[0].id,
            username: userInfo[0].screen_name,
            first_name: userInfo[0].first_name,
            last_name: userInfo[0].last_name,
            full_name: userInfo[0].first_name + ' ' + userInfo[0].last_name,
            type: 'user',
        };
        console.log(userInfo);
        return result;
    }

    async fetchChatInfo (chatId) {
        return {id: chatId};
        let userInfo;
        let result;
        if (userId === this.BC.SELF_SEND || userId === 0 || userId === undefined) {
            userInfo = this.user;
        } else {
            let params = {
                fields: [
                    'screen_name',
                ],
                user_ids: [
                    userId
                ]
            };
            userInfo = await this.Transport.api.users.get(params);
            // if (!this.BC.MT.empty(userInfo) && !this.BC.MT.empty(userInfo[0])) {
            //     userInfo = userInfo[0];
            // }
        }
        result = {
            id: userInfo[0].id,
            username: userInfo[0].screen_name,
            first_name: userInfo[0].first_name,
            last_name: userInfo[0].last_name,
            full_name: userInfo[0].first_name + ' ' + userInfo[0].last_name,
            type: 'user',
        };
        console.log(userInfo);
        return result;
    }

    async launch(middleware, ...middlewares) {

        let result = await (async () => this.Streaming.startWebSocket())().catch(
            e => console.error('VK STREAMING LAUNCH ERROR', e)
        );

        await this.reloadRules(this._keywords);

        // switch (this.mode) {
        //     case this.MODES.GROUP:
        //         result = this.Transport.updates.start().catch(console.error);
        //         break;
        //
        //     case this.MODES.USER:
        //         let auth = this.Transport.auth.androidApp();
        //         result = auth.run()
        //             .then((response) => {
        //                 // console.log('User response:',response);
        //                 this.Transport.token = response.token;
        //                 return this.Transport.updates.start().catch(console.error);
        //             })
        //             .catch((error) => {
        //                 console.error(error);
        //             });
        //         break;
        // }

        if (this._mode === this.MODES.GROUP) {
            if (this.params.pollingGroupId) {
                this.Transport.api.groups.getById({group_id: this.params.pollingGroupId}).then(user => {
                    this.user = user;
                    console.log(this.user)
                });
            } else {
                this.user = {id: 0};
            }
        } else {
            this.Transport.api.users.get({fields: ['screen_name']}).then(user => {
                this.user = user;
                console.log(this.user)
            });
        }
        console.log('VK STREAMING', this.name, 'started');

        // this.Transport.updates.start().catch(console.error);
        // this.Transport.updates.startPolling();

        return result;
    }

    reloadRules = async (rules) => {
        let existed = await this.Streaming.getRules() || [];
        rules = this.BC.MT.copyObject(rules);
        // console.log(existed);

        for (let rule of existed) {
            if (rule.tag in rules) {
                delete rules[rule.tag];
                continue;
            }
            // console.debug('RELOAD RULES. DELETE RULE', rule.tag);
            await this.Streaming.deleteRule(rule.tag).catch(e => console.error('RELOAD RULES. ERROR WHILE DELETE RULE', e));
        }
        for (let tag in rules) {
            if (rules.hasOwnProperty(tag)) {
                console.debug('RELOAD RULES. ADD RULE', tag);
                await this.Streaming.addRule(rules[tag]).catch(e => console.error('RELOAD RULES. ERROR WHILE ADD RULE', rules[tag], e));
            }
        }


        // console.log('RELOAD RULES. KEYWORDS', this._keywords, 'COPIED', rules);
    }
}


//     vk.updates.hear(/hello/i, context => (
//     context.send('World!')
// ));


module.exports = Object.assign(VKontakte, {VK});
module.exports.default = Object.assign(VKontakte, {VK});