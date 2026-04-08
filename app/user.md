普通用户账号密码登录
var axios = require('axios');
var data = JSON.stringify({
   "email": "kukaxsmx@dynmsl.com",
   "password": "82kzikirlk"
});

var config = {
   method: 'post',
   url: 'https://mail.dynmsl.com/api/login',
   headers: { 
      'Content-Type': 'application/json'
   },
   data : data
};

axios(config)
.then(function (response) {
   console.log(JSON.stringify(response.data));
})
.catch(function (error) {
   console.log(error);
});

返回的信息
{
    "code": 200,
    "message": "success",
    "data": {
        "token": "eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJ1c2VySWQiOjE0MywidG9rZW4iOiIxYjczZGE4My1jZTYzLTRkY2QtYTUzOC0zNGMzNjAyZGQxZTciLCJpYXQiOjE3NzA5MDY5Nzh9.OiaBygeD3Q3da27PLGnCdXEyNqz86nAJH8flBC74KvY"
    }
}

检测普通用户自己的列表
var axios = require('axios');

var config = {
   method: 'get',
   url: 'https://mail.dynmsl.com/api/my/loginUserInfo',
   headers: { 
      'authorization': 'eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJ1c2VySWQiOjE0MywidG9rZW4iOiIxYjczZGE4My1jZTYzLTRkY2QtYTUzOC0zNGMzNjAyZGQxZTciLCJpYXQiOjE3NzA5MDY5Nzh9.OiaBygeD3Q3da27PLGnCdXEyNqz86nAJH8flBC74KvY'
   }
};

axios(config)
.then(function (response) {
   console.log(JSON.stringify(response.data));
})
.catch(function (error) {
   console.log(error);
});

返回的信息
{
    "code": 200,
    "message": "success",
    "data": {
        "userId": 143,
        "sendCount": 0,
        "email": "kukaxsmx@dynmsl.com",
        "account": {
            "accountId": 146,
            "email": "kukaxsmx@dynmsl.com",
            "name": "kukaxsmx",
            "status": 0,
            "latestEmailTime": null,
            "createTime": "2026-02-07 18:09:42",
            "userId": 143,
            "allReceive": 0,
            "sort": 0,
            "isDel": 0
        },
        "name": "kukaxsmx",
        "permKeys": [
            "email:delete",
            "account:query",
            "account:add",
            "account:delete",
            "my:delete",
            "email:send"
        ],
        "role": {
            "roleId": 1,
            "name": "普通用户",
            "key": null,
            "description": "只有普通使用权限",
            "banEmail": "",
            "banEmailType": 0,
            "availDomain": "",
            "sort": 0,
            "isDefault": 1,
            "createTime": "0000-00-00 00:00:00",
            "userId": 0,
            "sendCount": null,
            "sendType": "ban",
            "accountCount": 10
        },
        "type": 1
    }
}

获取普通用户自己的账号邮箱列表
var axios = require('axios');

var config = {
   method: 'get',
   url: 'https://mail.dynmsl.com/api/email/list?accountId=146&allReceive=0&emailId=0&timeSort=0&type=0',
   headers: { 
      'authorization': 'eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJ1c2VySWQiOjE0MywidG9rZW4iOiIxYjczZGE4My1jZTYzLTRkY2QtYTUzOC0zNGMzNjAyZGQxZTciLCJpYXQiOjE3NzA5MDY5Nzh9.OiaBygeD3Q3da27PLGnCdXEyNqz86nAJH8flBC74KvY'
   }
};

axios(config)
.then(function (response) {
   console.log(JSON.stringify(response.data));
})
.catch(function (error) {
   console.log(error);
});

返回的信息
{
    "code": 200,
    "message": "success",
    "data": {
        "list": [
            {
                "emailId": 359,
                "sendEmail": "tztright@gmail.com",
                "name": "Mr Tzt",
                "accountId": 146,
                "userId": 143,
                "subject": "888888",
                "text": "\n\n",
                "content": "<div dir=\"ltr\"><br></div>\n\n",
                "cc": "[]",
                "bcc": "[]",
                "recipient": "[{\"address\":\"kukaxsmx@dynmsl.com\",\"name\":\"\"}]",
                "toEmail": "kukaxsmx@dynmsl.com",
                "toName": "",
                "inReplyTo": "",
                "relation": "",
                "messageId": "<CAEvhw7Zz53Wycf-8ot_j-gHJRJAstnNtBtLaX7FikDf1Bc0DQg@mail.gmail.com>",
                "type": 0,
                "status": 0,
                "resendEmailId": null,
                "message": null,
                "unread": 1,
                "createTime": "2026-02-12 14:18:28",
                "isDel": 0,
                "starId": null,
                "isStar": 0,
                "attList": []
            },
            {
                "emailId": 358,
                "sendEmail": "tztright@gmail.com",
                "name": "Mr Tzt",
                "accountId": 146,
                "userId": 143,
                "subject": "Re: test",
                "text": "3333\n\nOn Thu, Feb 12, 2026 at 10:08 PM Mr Tzt <tztright@gmail.com> wrote:\n\n> 123\n>\n> On Thu, Feb 12, 2026 at 9:53 PM Mr Tzt <tztright@gmail.com> wrote:\n>\n>>\n>>\n\n",
                "content": "<div dir=\"ltr\">3333</div><br><div class=\"gmail_quote gmail_quote_container\"><div dir=\"ltr\" class=\"gmail_attr\">On Thu, Feb 12, 2026 at 10:08 PM Mr Tzt &lt;<a href=\"mailto:tztright@gmail.com\">tztright@gmail.com</a>&gt; wrote:<br></div><blockquote class=\"gmail_quote\" style=\"margin:0px 0px 0px 0.8ex;border-left:1px solid rgb(204,204,204);padding-left:1ex\"><div dir=\"ltr\"><div dir=\"ltr\">123</div><br><div class=\"gmail_quote\"><div dir=\"ltr\" class=\"gmail_attr\">On Thu, Feb 12, 2026 at 9:53 PM Mr Tzt &lt;<a href=\"mailto:tztright@gmail.com\" target=\"_blank\">tztright@gmail.com</a>&gt; wrote:<br></div><blockquote class=\"gmail_quote\" style=\"margin:0px 0px 0px 0.8ex;border-left:1px solid rgb(204,204,204);padding-left:1ex\"><div dir=\"ltr\"><br></div>\n</blockquote></div>\n</div>\n</blockquote></div>\n\n",
                "cc": "[]",
                "bcc": "[]",
                "recipient": "[{\"address\":\"kukaxsmx@dynmsl.com\",\"name\":\"\"}]",
                "toEmail": "kukaxsmx@dynmsl.com",
                "toName": "",
                "inReplyTo": "<CAEvhw7Yk9PN5d-kHaDSaw7GCY+fgugjm3t4c2RzuAqOrGVHXFg@mail.gmail.com>",
                "relation": "<CAEvhw7aLG=VT5RTt0e=JHMXn3bo64kaAL1WiNt5P1EEnRAk4wg@mail.gmail.com> <CAEvhw7Yk9PN5d-kHaDSaw7GCY+fgugjm3t4c2RzuAqOrGVHXFg@mail.gmail.com>",
                "messageId": "<CAEvhw7aNhpEp4jxDhsaPn2vdHURzWBbPeDa=abCen78-icegkQ@mail.gmail.com>",
                "type": 0,
                "status": 0,
                "resendEmailId": null,
                "message": null,
                "unread": 1,
                "createTime": "2026-02-12 14:16:42",
                "isDel": 0,
                "starId": null,
                "isStar": 0,
                "attList": []
            },
            {
                "emailId": 357,
                "sendEmail": "tztright@gmail.com",
                "name": "Mr Tzt",
                "accountId": 146,
                "userId": 143,
                "subject": "Re: test",
                "text": "123\n\nOn Thu, Feb 12, 2026 at 9:53 PM Mr Tzt <tztright@gmail.com> wrote:\n\n>\n>\n\n",
                "content": "<div dir=\"ltr\"><div dir=\"ltr\">123</div><br><div class=\"gmail_quote\"><div dir=\"ltr\" class=\"gmail_attr\">On Thu, Feb 12, 2026 at 9:53 PM Mr Tzt &lt;<a href=\"mailto:tztright@gmail.com\" target=\"_blank\">tztright@gmail.com</a>&gt; wrote:<br></div><blockquote class=\"gmail_quote\" style=\"margin:0px 0px 0px 0.8ex;border-left:1px solid rgb(204,204,204);padding-left:1ex\"><div dir=\"ltr\"><br></div>\n</blockquote></div>\n</div>\n\n",
                "cc": "[]",
                "bcc": "[]",
                "recipient": "[{\"address\":\"kukaxsmx@dynmsl.com\",\"name\":\"\"}]",
                "toEmail": "kukaxsmx@dynmsl.com",
                "toName": "",
                "inReplyTo": "<CAEvhw7aLG=VT5RTt0e=JHMXn3bo64kaAL1WiNt5P1EEnRAk4wg@mail.gmail.com>",
                "relation": "<CAEvhw7aLG=VT5RTt0e=JHMXn3bo64kaAL1WiNt5P1EEnRAk4wg@mail.gmail.com>",
                "messageId": "<CAEvhw7Yk9PN5d-kHaDSaw7GCY+fgugjm3t4c2RzuAqOrGVHXFg@mail.gmail.com>",
                "type": 0,
                "status": 0,
                "resendEmailId": null,
                "message": null,
                "unread": 1,
                "createTime": "2026-02-12 14:08:50",
                "isDel": 0,
                "starId": null,
                "isStar": 0,
                "attList": []
            },
            {
                "emailId": 356,
                "sendEmail": "tztright@gmail.com",
                "name": "Mr Tzt",
                "accountId": 146,
                "userId": 143,
                "subject": "test",
                "text": "\n\n",
                "content": "<div dir=\"ltr\"><br></div>\n\n",
                "cc": "[]",
                "bcc": "[]",
                "recipient": "[{\"address\":\"kukaxsmx@dynmsl.com\",\"name\":\"\"}]",
                "toEmail": "kukaxsmx@dynmsl.com",
                "toName": "",
                "inReplyTo": "",
                "relation": "",
                "messageId": "<CAEvhw7aLG=VT5RTt0e=JHMXn3bo64kaAL1WiNt5P1EEnRAk4wg@mail.gmail.com>",
                "type": 0,
                "status": 0,
                "resendEmailId": null,
                "message": null,
                "unread": 1,
                "createTime": "2026-02-12 13:54:02",
                "isDel": 0,
                "starId": null,
                "isStar": 0,
                "attList": []
            }
        ],
        "total": 4,
        "latestEmail": {
            "emailId": 359,
            "sendEmail": "tztright@gmail.com",
            "name": "Mr Tzt",
            "accountId": 146,
            "userId": 143,
            "subject": "888888",
            "text": "\n\n",
            "content": "<div dir=\"ltr\"><br></div>\n\n",
            "cc": "[]",
            "bcc": "[]",
            "recipient": "[{\"address\":\"kukaxsmx@dynmsl.com\",\"name\":\"\"}]",
            "toEmail": "kukaxsmx@dynmsl.com",
            "toName": "",
            "inReplyTo": "",
            "relation": "",
            "messageId": "<CAEvhw7Zz53Wycf-8ot_j-gHJRJAstnNtBtLaX7FikDf1Bc0DQg@mail.gmail.com>",
            "type": 0,
            "status": 0,
            "resendEmailId": null,
            "message": null,
            "unread": 1,
            "createTime": "2026-02-12 14:18:28",
            "isDel": 0
        }
    }
}