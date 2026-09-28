{
  "patcher": {
    "fileversion": 1,
    "appversion": {
      "major": 8,
      "minor": 5,
      "revision": 8,
      "architecture": "x64",
      "modernui": 1
    },
    "classnamespace": "box",
    "rect": [
      59,
      107,
      760,
      440
    ],
    "openrect": [
      0,
      0,
      480,
      169
    ],
    "bglocked": 0,
    "openinpresentation": 1,
    "default_fontsize": 10,
    "default_fontface": 0,
    "default_fontname": "Arial Bold",
    "gridonopen": 1,
    "gridsize": [
      8,
      8
    ],
    "gridsnaponopen": 1,
    "objectsnaponopen": 1,
    "statusbarvisible": 2,
    "toolbarvisible": 1,
    "lefttoolbarpinned": 0,
    "toptoolbarpinned": 0,
    "righttoolbarpinned": 0,
    "bottomtoolbarpinned": 0,
    "toolbars_unpinned_last_save": 0,
    "tallnewobj": 0,
    "boxanimatetime": 500,
    "enablehscroll": 1,
    "enablevscroll": 1,
    "devicewidth": 480,
    "description": "",
    "digest": "",
    "tags": "",
    "style": "",
    "subpatcher_template": "",
    "assistshowspatchername": 0,
    "boxes": [
      {
        "box": {
          "bgcolor": [
            0.72,
            0.93,
            0.8,
            1
          ],
          "fontface": 1,
          "fontname": "Arial",
          "fontsize": 11,
          "id": "setup-button",
          "maxclass": "textbutton",
          "numinlets": 1,
          "numoutlets": 3,
          "outlettype": [
            "",
            "",
            "int"
          ],
          "parameter_enable": 0,
          "patching_rect": [
            326,
            12,
            66,
            23
          ],
          "presentation": 1,
          "presentation_rect": [
            326,
            12,
            66,
            23
          ],
          "rounded": 6,
          "saved_attribute_attributes": {
            "bgcolor": {
              "expression": ""
            },
            "textcolor": {
              "expression": ""
            }
          },
          "text": "SETUP",
          "textcolor": [
            0.29,
            0.25,
            0.4,
            1
          ]
        }
      },
      {
        "box": {
          "annotation": "使い方と接続設定を開く",
          "bgcolor": [
            0.81,
            0.78,
            0.92,
            1
          ],
          "fontface": 1,
          "fontname": "Arial",
          "fontsize": 11,
          "id": "help-button",
          "maxclass": "textbutton",
          "numinlets": 1,
          "numoutlets": 3,
          "outlettype": [
            "",
            "",
            "int"
          ],
          "parameter_enable": 0,
          "patching_rect": [
            400,
            12,
            62,
            23
          ],
          "presentation": 1,
          "presentation_rect": [
            400,
            12,
            62,
            23
          ],
          "rounded": 6,
          "saved_attribute_attributes": {
            "bgcolor": {
              "expression": ""
            },
            "textcolor": {
              "expression": ""
            }
          },
          "text": "HELP",
          "textcolor": [
            0.29,
            0.25,
            0.4,
            1
          ],
          "texton": "HELP"
        }
      },
      {
        "box": {
          "fontface": 0,
          "fontname": "Arial",
          "fontsize": 9,
          "id": "version",
          "maxclass": "comment",
          "numinlets": 1,
          "numoutlets": 0,
          "patching_rect": [
            376,
            148,
            92,
            17
          ],
          "presentation": 1,
          "presentation_rect": [
            376,
            148,
            92,
            17
          ],
          "text": "v0.6 / ALL",
          "textcolor": [
            0.46,
            0.43,
            0.52,
            1
          ],
          "varname": "version"
        }
      },
      {
        "box": {
          "fontface": 0,
          "fontname": "Arial",
          "fontsize": 9,
          "id": "footer",
          "maxclass": "comment",
          "numinlets": 1,
          "numoutlets": 0,
          "patching_rect": [
            174,
            148,
            130,
            17
          ],
          "presentation": 1,
          "presentation_rect": [
            174,
            148,
            130,
            17
          ],
          "text": "AUDIO THROUGH",
          "textcolor": [
            0.46,
            0.43,
            0.52,
            1
          ],
          "varname": "footer"
        }
      },
      {
        "box": {
          "fontface": 0,
          "fontname": "Arial",
          "fontsize": 10,
          "id": "activity",
          "maxclass": "comment",
          "numinlets": 1,
          "numoutlets": 0,
          "patching_rect": [
            174,
            123,
            286,
            18
          ],
          "presentation": 1,
          "presentation_rect": [
            174,
            123,
            286,
            18
          ],
          "text": "Waiting for an agent request",
          "textcolor": [
            0.46,
            0.43,
            0.52,
            1
          ],
          "varname": "activity"
        }
      },
      {
        "box": {
          "fontface": 1,
          "fontname": "Arial",
          "fontsize": 12,
          "id": "track",
          "maxclass": "comment",
          "numinlets": 1,
          "numoutlets": 0,
          "patching_rect": [
            174,
            101,
            286,
            20
          ],
          "presentation": 1,
          "presentation_rect": [
            174,
            101,
            286,
            20
          ],
          "text": "Placed on: Master",
          "textcolor": [
            0.29,
            0.25,
            0.4,
            1
          ],
          "varname": "track"
        }
      },
      {
        "box": {
          "fontface": 1,
          "fontname": "Arial",
          "fontsize": 11,
          "id": "clients",
          "maxclass": "comment",
          "numinlets": 1,
          "numoutlets": 0,
          "patching_rect": [
            184,
            74,
            244,
            19
          ],
          "presentation": 1,
          "presentation_rect": [
            184,
            74,
            244,
            19
          ],
          "text": "ALL TRACKS  /  PROJECT",
          "textcolor": [
            0.29,
            0.25,
            0.4,
            1
          ],
          "varname": "clients"
        }
      },
      {
        "box": {
          "background": 1,
          "bgcolor": [
            0.72,
            0.93,
            0.8,
            1
          ],
          "id": "client-pill",
          "maxclass": "panel",
          "mode": 0,
          "numinlets": 1,
          "numoutlets": 0,
          "patching_rect": [
            175,
            70,
            263,
            23
          ],
          "presentation": 1,
          "presentation_rect": [
            175,
            70,
            263,
            23
          ],
          "saved_attribute_attributes": {
            "bgfillcolor": {
              "expression": ""
            }
          }
        }
      },
      {
        "box": {
          "fontface": 1,
          "fontname": "Arial",
          "fontsize": 25,
          "id": "title",
          "maxclass": "comment",
          "numinlets": 1,
          "numoutlets": 0,
          "patching_rect": [
            172,
            29,
            270,
            35
          ],
          "presentation": 1,
          "presentation_rect": [
            172,
            29,
            270,
            35
          ],
          "text": "LIVE BRIDGE",
          "textcolor": [
            0.29,
            0.25,
            0.4,
            1
          ],
          "varname": "title"
        }
      },
      {
        "box": {
          "fontface": 0,
          "fontname": "Arial",
          "fontsize": 10,
          "id": "brand",
          "maxclass": "comment",
          "numinlets": 1,
          "numoutlets": 0,
          "patching_rect": [
            174,
            12,
            146,
            18
          ],
          "presentation": 1,
          "presentation_rect": [
            174,
            12,
            146,
            18
          ],
          "text": "aoe1928 / Audio",
          "textcolor": [
            0.46,
            0.43,
            0.52,
            1
          ],
          "varname": "brand"
        }
      },
      {
        "box": {
          "background": 1,
          "bgcolor": [
            0.84,
            0.82,
            0.8,
            1
          ],
          "id": "divider",
          "maxclass": "panel",
          "mode": 0,
          "numinlets": 1,
          "numoutlets": 0,
          "patching_rect": [
            157,
            20,
            4,
            129
          ],
          "presentation": 1,
          "presentation_rect": [
            157,
            20,
            4,
            129
          ],
          "rounded": 0,
          "saved_attribute_attributes": {
            "bgfillcolor": {
              "expression": ""
            }
          }
        }
      },
      {
        "box": {
          "autofit": 1,
          "forceaspect": 1,
          "id": "mascot",
          "ignoreclick": 1,
          "maxclass": "fpic",
          "numinlets": 1,
          "numoutlets": 1,
          "outlettype": [
            "jit_matrix"
          ],
          "patching_rect": [
            0,
            5,
            159,
            159
          ],
          "pic": "bridge-mascot.png",
          "presentation": 1,
          "presentation_rect": [
            0,
            5,
            159,
            159
          ]
        }
      },
      {
        "box": {
          "background": 1,
          "bgcolor": [
            0.81,
            0.78,
            0.92,
            1
          ],
          "id": "top-line",
          "maxclass": "panel",
          "mode": 0,
          "numinlets": 1,
          "numoutlets": 0,
          "patching_rect": [
            0,
            0,
            480,
            4
          ],
          "presentation": 1,
          "presentation_rect": [
            0,
            0,
            480,
            4
          ],
          "rounded": 0,
          "saved_attribute_attributes": {
            "bgfillcolor": {
              "expression": ""
            }
          }
        }
      },
      {
        "box": {
          "id": "udp",
          "maxclass": "newobj",
          "numinlets": 1,
          "numoutlets": 1,
          "outlettype": [
            ""
          ],
          "patching_rect": [
            120,
            20,
            210,
            20
          ],
          "saved_object_attributes": {
            "defer": 1
          },
          "text": "udpreceive 17831 @defer 1"
        }
      },
      {
        "box": {
          "id": "defer",
          "maxclass": "newobj",
          "numinlets": 1,
          "numoutlets": 1,
          "outlettype": [
            ""
          ],
          "patching_rect": [
            120,
            60,
            210,
            20
          ],
          "text": "deferlow"
        }
      },
      {
        "box": {
          "id": "js",
          "maxclass": "newobj",
          "numinlets": 1,
          "numoutlets": 1,
          "outlettype": [
            ""
          ],
          "patching_rect": [
            120,
            100,
            210,
            20
          ],
          "saved_object_attributes": {
            "filename": "live-api.js",
            "parameter_enable": 0
          },
          "text": "js live-api.js"
        }
      },
      {
        "box": {
          "id": "send",
          "maxclass": "newobj",
          "numinlets": 1,
          "numoutlets": 0,
          "patching_rect": [
            120,
            160,
            210,
            20
          ],
          "text": "udpsend 127.0.0.1 17832"
        }
      },
      {
        "box": {
          "id": "ready",
          "maxclass": "newobj",
          "numinlets": 1,
          "numoutlets": 3,
          "outlettype": [
            "bang",
            "int",
            "int"
          ],
          "patching_rect": [
            370,
            20,
            210,
            20
          ],
          "text": "live.thisdevice"
        }
      },
      {
        "box": {
          "id": "delay",
          "maxclass": "newobj",
          "numinlets": 2,
          "numoutlets": 1,
          "outlettype": [
            "bang"
          ],
          "patching_rect": [
            370,
            60,
            210,
            20
          ],
          "text": "delay 500"
        }
      },
      {
        "box": {
          "id": "init",
          "maxclass": "newobj",
          "numinlets": 1,
          "numoutlets": 1,
          "outlettype": [
            ""
          ],
          "patching_rect": [
            370,
            100,
            210,
            20
          ],
          "text": "prepend init"
        }
      },
      {
        "box": {
          "id": "help-window",
          "maxclass": "newobj",
          "numinlets": 1,
          "numoutlets": 0,
          "patcher": {
            "fileversion": 1,
            "appversion": {
              "major": 8,
              "minor": 5,
              "revision": 8,
              "architecture": "x64",
              "modernui": 1
            },
            "classnamespace": "box",
            "rect": [
              140,
              100,
              800,
              850
            ],
            "bglocked": 0,
            "openinpresentation": 1,
            "default_fontsize": 12,
            "default_fontface": 0,
            "default_fontname": "Meiryo",
            "gridonopen": 1,
            "gridsize": [
              15,
              15
            ],
            "gridsnaponopen": 1,
            "objectsnaponopen": 1,
            "statusbarvisible": 2,
            "toolbarvisible": 1,
            "lefttoolbarpinned": 0,
            "toptoolbarpinned": 0,
            "righttoolbarpinned": 0,
            "bottomtoolbarpinned": 0,
            "toolbars_unpinned_last_save": 0,
            "tallnewobj": 0,
            "boxanimatetime": 200,
            "enablehscroll": 1,
            "enablevscroll": 1,
            "devicewidth": 0,
            "description": "",
            "digest": "",
            "tags": "",
            "style": "",
            "subpatcher_template": "",
            "assistshowspatchername": 0,
            "boxes": [
              {
                "box": {
                  "fontface": 1,
                  "fontname": "Meiryo",
                  "fontsize": 23,
                  "id": "title",
                  "maxclass": "comment",
                  "numinlets": 1,
                  "numoutlets": 0,
                  "patching_rect": [
                    24,
                    18,
                    705,
                    34
                  ],
                  "presentation": 1,
                  "presentation_rect": [
                    24,
                    18,
                    705,
                    34
                  ],
                  "text": "LIVE BRIDGE  /  HELP",
                  "textcolor": [
                    0.29,
                    0.25,
                    0.4,
                    1
                  ]
                }
              },
              {
                "box": {
                  "fontface": 0,
                  "fontname": "Meiryo",
                  "fontsize": 12,
                  "id": "subtitle",
                  "maxclass": "comment",
                  "numinlets": 1,
                  "numoutlets": 0,
                  "patching_rect": [
                    26,
                    55,
                    700,
                    23
                  ],
                  "presentation": 1,
                  "presentation_rect": [
                    26,
                    55,
                    700,
                    23
                  ],
                  "text": "Codex / Antigravity と Ableton Live をつなぐ全トラック対応デバイス",
                  "textcolor": [
                    0.44,
                    0.41,
                    0.49,
                    1
                  ]
                }
              },
              {
                "box": {
                  "fontface": 0,
                  "fontname": "Meiryo",
                  "fontsize": 10,
                  "id": "footer",
                  "maxclass": "comment",
                  "numinlets": 1,
                  "numoutlets": 0,
                  "patching_rect": [
                    26,
                    810,
                    748,
                    24
                  ],
                  "presentation": 1,
                  "presentation_rect": [
                    26,
                    810,
                    748,
                    24
                  ],
                  "text": "通信時刻は最後に要求を受けた時刻です。常時接続中という表示ではありません。",
                  "textcolor": [
                    0.44,
                    0.41,
                    0.49,
                    1
                  ]
                }
              },
              {
                "box": {
                  "comment": "",
                  "id": "help-inlet",
                  "index": 1,
                  "maxclass": "inlet",
                  "numinlets": 0,
                  "numoutlets": 1,
                  "outlettype": [
                    ""
                  ],
                  "patching_rect": [
                    20,
                    880,
                    30,
                    30
                  ]
                }
              },
              {
                "box": {
                  "fontface": 1,
                  "fontname": "Meiryo",
                  "fontsize": 13,
                  "id": "heading0",
                  "maxclass": "comment",
                  "numinlets": 1,
                  "numoutlets": 0,
                  "patching_rect": [
                    26,
                    91,
                    748,
                    22
                  ],
                  "presentation": 1,
                  "presentation_rect": [
                    26,
                    91,
                    748,
                    22
                  ],
                  "text": "01  最初の準備",
                  "textcolor": [
                    0.29,
                    0.25,
                    0.4,
                    1
                  ]
                }
              },
              {
                "box": {
                  "fontface": 0,
                  "fontname": "Meiryo",
                  "fontsize": 11,
                  "id": "body0",
                  "linecount": 3,
                  "maxclass": "comment",
                  "numinlets": 1,
                  "numoutlets": 0,
                  "patching_rect": [
                    26,
                    115,
                    748,
                    61
                  ],
                  "presentation": 1,
                  "presentation_linecount": 3,
                  "presentation_rect": [
                    26,
                    115,
                    748,
                    61
                  ],
                  "text": "Max for Live の MIDI 版は音源の前、Audio 版は音源の後やマスターへ。Set に1個だけ配置。\nAI 側に Node.js と server.cjs / bridge-config.json を用意し、MCP「ableton_live」を登録。\nSETUP のプロンプトを AI に送ると接続設定を依頼できます。",
                  "textcolor": [
                    0.44,
                    0.41,
                    0.49,
                    1
                  ]
                }
              },
              {
                "box": {
                  "fontface": 1,
                  "fontname": "Meiryo",
                  "fontsize": 13,
                  "id": "heading1",
                  "maxclass": "comment",
                  "numinlets": 1,
                  "numoutlets": 0,
                  "patching_rect": [
                    26,
                    179,
                    748,
                    22
                  ],
                  "presentation": 1,
                  "presentation_rect": [
                    26,
                    179,
                    748,
                    22
                  ],
                  "text": "02  プラグイン挿入の準備",
                  "textcolor": [
                    0.29,
                    0.25,
                    0.4,
                    1
                  ]
                }
              },
              {
                "box": {
                  "fontface": 0,
                  "fontname": "Meiryo",
                  "fontsize": 11,
                  "id": "body1",
                  "linecount": 3,
                  "maxclass": "comment",
                  "numinlets": 1,
                  "numoutlets": 0,
                  "patching_rect": [
                    26,
                    203,
                    748,
                    61
                  ],
                  "presentation": 1,
                  "presentation_linecount": 3,
                  "presentation_rect": [
                    26,
                    203,
                    748,
                    61
                  ],
                  "text": "L2 の検索・挿入には追加の Remote Script「LiveBridgeBrowser」が必要です。\ninstall-browser.cjs にユーザーライブラリの場所を指定して実行 → Live を再起動。\n初回は配置と登録を行ってください。詳細はサーバーフォルダーの「ブラウザー連携.md」。",
                  "textcolor": [
                    0.44,
                    0.41,
                    0.49,
                    1
                  ]
                }
              },
              {
                "box": {
                  "fontface": 1,
                  "fontname": "Meiryo",
                  "fontsize": 13,
                  "id": "heading2",
                  "maxclass": "comment",
                  "numinlets": 1,
                  "numoutlets": 0,
                  "patching_rect": [
                    26,
                    267,
                    748,
                    22
                  ],
                  "presentation": 1,
                  "presentation_rect": [
                    26,
                    267,
                    748,
                    22
                  ],
                  "text": "03  Live の環境設定",
                  "textcolor": [
                    0.29,
                    0.25,
                    0.4,
                    1
                  ]
                }
              },
              {
                "box": {
                  "fontface": 0,
                  "fontname": "Meiryo",
                  "fontsize": 11,
                  "id": "body2",
                  "linecount": 3,
                  "maxclass": "comment",
                  "numinlets": 1,
                  "numoutlets": 0,
                  "patching_rect": [
                    26,
                    291,
                    748,
                    61
                  ],
                  "presentation": 1,
                  "presentation_linecount": 3,
                  "presentation_rect": [
                    26,
                    291,
                    748,
                    61
                  ],
                  "text": "環境設定 → Link/Tempo/MIDI → 空いているコントロールサーフェス欄を選びます。\nコントロールサーフェス：LiveBridgeBrowser ／ 入力：None ／ 出力：None\nKeyLab など既存のコントローラー設定はそのまま。MIDI 機器との接続は不要です。",
                  "textcolor": [
                    0.44,
                    0.41,
                    0.49,
                    1
                  ]
                }
              },
              {
                "box": {
                  "fontface": 1,
                  "fontname": "Meiryo",
                  "fontsize": 13,
                  "id": "heading3",
                  "maxclass": "comment",
                  "numinlets": 1,
                  "numoutlets": 0,
                  "patching_rect": [
                    26,
                    355,
                    748,
                    22
                  ],
                  "presentation": 1,
                  "presentation_rect": [
                    26,
                    355,
                    748,
                    22
                  ],
                  "text": "04  一度設定すれば、他のプロジェクトでも共通",
                  "textcolor": [
                    0.29,
                    0.25,
                    0.4,
                    1
                  ]
                }
              },
              {
                "box": {
                  "fontface": 0,
                  "fontname": "Meiryo",
                  "fontsize": 11,
                  "id": "body3",
                  "linecount": 3,
                  "maxclass": "comment",
                  "numinlets": 1,
                  "numoutlets": 0,
                  "patching_rect": [
                    26,
                    379,
                    748,
                    61
                  ],
                  "presentation": 1,
                  "presentation_linecount": 3,
                  "presentation_rect": [
                    26,
                    379,
                    748,
                    61
                  ],
                  "text": "Remote Script の登録は Live 全体の設定です。Set ごとに登録し直す必要はありません。\nNone に戻すとプラグインの検索・挿入が停止します。挿した L2 は残ります。\nMax デバイス経由の MIDI・音量・テンポ操作は別経路なので、引き続き利用できます。",
                  "textcolor": [
                    0.44,
                    0.41,
                    0.49,
                    1
                  ]
                }
              },
              {
                "box": {
                  "fontface": 1,
                  "fontname": "Meiryo",
                  "fontsize": 13,
                  "id": "heading4",
                  "maxclass": "comment",
                  "numinlets": 1,
                  "numoutlets": 0,
                  "patching_rect": [
                    26,
                    443,
                    748,
                    22
                  ],
                  "presentation": 1,
                  "presentation_rect": [
                    26,
                    443,
                    748,
                    22
                  ],
                  "text": "05  AI を再接続して使う",
                  "textcolor": [
                    0.29,
                    0.25,
                    0.4,
                    1
                  ]
                }
              },
              {
                "box": {
                  "fontface": 0,
                  "fontname": "Meiryo",
                  "fontsize": 11,
                  "id": "body4",
                  "linecount": 3,
                  "maxclass": "comment",
                  "numinlets": 1,
                  "numoutlets": 0,
                  "patching_rect": [
                    26,
                    467,
                    748,
                    61
                  ],
                  "presentation": 1,
                  "presentation_linecount": 3,
                  "presentation_rect": [
                    26,
                    467,
                    748,
                    61
                  ],
                  "text": "Codex / Antigravity の ableton_live を再接続し、20 ツールを確認します。\nlive_browser_status で接続確認 → live_search_plugins で L2 を検索。\n例：「Kick と Sn の末尾に Waves L2 Stereo を挿して。既にあればスキップして」",
                  "textcolor": [
                    0.44,
                    0.41,
                    0.49,
                    1
                  ]
                }
              },
              {
                "box": {
                  "fontface": 1,
                  "fontname": "Meiryo",
                  "fontsize": 13,
                  "id": "heading5",
                  "maxclass": "comment",
                  "numinlets": 1,
                  "numoutlets": 0,
                  "patching_rect": [
                    26,
                    531,
                    748,
                    22
                  ],
                  "presentation": 1,
                  "presentation_rect": [
                    26,
                    531,
                    748,
                    22
                  ],
                  "text": "06  挿入時の動作",
                  "textcolor": [
                    0.29,
                    0.25,
                    0.4,
                    1
                  ]
                }
              },
              {
                "box": {
                  "fontface": 0,
                  "fontname": "Meiryo",
                  "fontsize": 11,
                  "id": "body5",
                  "linecount": 3,
                  "maxclass": "comment",
                  "numinlets": 1,
                  "numoutlets": 0,
                  "patching_rect": [
                    26,
                    555,
                    748,
                    61
                  ],
                  "presentation": 1,
                  "presentation_linecount": 3,
                  "presentation_rect": [
                    26,
                    555,
                    748,
                    61
                  ],
                  "text": "再生・録音を停止して実行。指定トラックの末尾へ1本ずつ挿入し、結果を照合します。\n初期版は L2 Mono / Stereo に対応。音声出力のない MIDI、フリーズ中は対象外です。\n検索・挿入に画面操作は不要。Set の自動保存、Rack 内部への挿入は未実装です。",
                  "textcolor": [
                    0.44,
                    0.41,
                    0.49,
                    1
                  ]
                }
              },
              {
                "box": {
                  "fontface": 1,
                  "fontname": "Meiryo",
                  "fontsize": 13,
                  "id": "heading6",
                  "maxclass": "comment",
                  "numinlets": 1,
                  "numoutlets": 0,
                  "patching_rect": [
                    26,
                    619,
                    748,
                    22
                  ],
                  "presentation": 1,
                  "presentation_rect": [
                    26,
                    619,
                    748,
                    22
                  ],
                  "text": "07  通信の仕組み",
                  "textcolor": [
                    0.29,
                    0.25,
                    0.4,
                    1
                  ]
                }
              },
              {
                "box": {
                  "fontface": 0,
                  "fontname": "Meiryo",
                  "fontsize": 11,
                  "id": "body6",
                  "linecount": 3,
                  "maxclass": "comment",
                  "numinlets": 1,
                  "numoutlets": 0,
                  "patching_rect": [
                    26,
                    643,
                    748,
                    61
                  ],
                  "presentation": 1,
                  "presentation_linecount": 3,
                  "presentation_rect": [
                    26,
                    643,
                    748,
                    61
                  ],
                  "text": "AI ⇄ STDIO MCP ⇄ ローカル UDP ⇄ Max デバイス / Remote Script ⇄ Live\nMax：17831 / 17832、Remote Script：127.0.0.1:17833。共有トークンで認証します。\nHTTP サーバーやルーターのポート開放は不要。トークンは会話に貼らないでください。",
                  "textcolor": [
                    0.44,
                    0.41,
                    0.49,
                    1
                  ]
                }
              },
              {
                "box": {
                  "fontface": 1,
                  "fontname": "Meiryo",
                  "fontsize": 13,
                  "id": "heading7",
                  "maxclass": "comment",
                  "numinlets": 1,
                  "numoutlets": 0,
                  "patching_rect": [
                    26,
                    707,
                    748,
                    22
                  ],
                  "presentation": 1,
                  "presentation_rect": [
                    26,
                    707,
                    748,
                    22
                  ],
                  "text": "08  つながらないとき",
                  "textcolor": [
                    0.29,
                    0.25,
                    0.4,
                    1
                  ]
                }
              },
              {
                "box": {
                  "fontface": 0,
                  "fontname": "Meiryo",
                  "fontsize": 11,
                  "id": "body7",
                  "linecount": 3,
                  "maxclass": "comment",
                  "numinlets": 1,
                  "numoutlets": 0,
                  "patching_rect": [
                    26,
                    731,
                    748,
                    61
                  ],
                  "presentation": 1,
                  "presentation_linecount": 3,
                  "presentation_rect": [
                    26,
                    731,
                    748,
                    61
                  ],
                  "text": "L2 の検索：LiveBridgeBrowser の選択、Live 再起動、MCP 再接続を確認します。\nMIDI・ミキサー：Max デバイスが1個だけ有効か、live_status が応答するかを確認。\nタイムアウト後は挿入済みか読み直します。Antigravity アプリ内での認識は未確認です。",
                  "textcolor": [
                    0.44,
                    0.41,
                    0.49,
                    1
                  ]
                }
              }
            ],
            "lines": [],
            "bgcolor": [
              1,
              0.976,
              0.914,
              1
            ],
            "editing_bgcolor": [
              1,
              0.976,
              0.914,
              1
            ],
            "saved_attribute_attributes": {
              "default_plcolor": {
                "expression": ""
              },
              "editing_bgcolor": {
                "expression": ""
              },
              "locked_bgcolor": {
                "expression": ""
              }
            }
          },
          "patching_rect": [
            510,
            310,
            160,
            20
          ],
          "saved_attribute_attributes": {
            "default_plcolor": {
              "expression": ""
            },
            "editing_bgcolor": {
              "expression": ""
            },
            "locked_bgcolor": {
              "expression": ""
            }
          },
          "saved_object_attributes": {
            "description": "",
            "digest": "",
            "editing_bgcolor": [
              1,
              0.976,
              0.914,
              1
            ],
            "fontname": "Meiryo",
            "globalpatchername": "",
            "locked_bgcolor": [
              1,
              0.976,
              0.914,
              1
            ],
            "tags": ""
          },
          "text": "p Live Bridge HELP"
        }
      },
      {
        "box": {
          "id": "help-open",
          "maxclass": "message",
          "numinlets": 2,
          "numoutlets": 1,
          "outlettype": [
            ""
          ],
          "patching_rect": [
            510,
            240,
            45,
            20
          ],
          "text": "open"
        }
      },
      {
        "box": {
          "id": "help-control",
          "maxclass": "newobj",
          "numinlets": 1,
          "numoutlets": 1,
          "outlettype": [
            ""
          ],
          "patching_rect": [
            510,
            275,
            70,
            20
          ],
          "text": "pcontrol"
        }
      },
      {
        "box": {
          "id": "setup-window",
          "maxclass": "newobj",
          "numinlets": 1,
          "numoutlets": 0,
          "patcher": {
            "fileversion": 1,
            "appversion": {
              "major": 8,
              "minor": 5,
              "revision": 8,
              "architecture": "x64",
              "modernui": 1
            },
            "classnamespace": "box",
            "rect": [
              120,
              90,
              800,
              760
            ],
            "bglocked": 0,
            "openinpresentation": 1,
            "default_fontsize": 12,
            "default_fontface": 0,
            "default_fontname": "Arial",
            "gridonopen": 1,
            "gridsize": [
              15,
              15
            ],
            "gridsnaponopen": 1,
            "objectsnaponopen": 1,
            "statusbarvisible": 2,
            "toolbarvisible": 1,
            "lefttoolbarpinned": 0,
            "toptoolbarpinned": 0,
            "righttoolbarpinned": 0,
            "bottomtoolbarpinned": 0,
            "toolbars_unpinned_last_save": 0,
            "tallnewobj": 0,
            "boxanimatetime": 200,
            "enablehscroll": 1,
            "enablevscroll": 1,
            "devicewidth": 0,
            "description": "",
            "digest": "",
            "tags": "",
            "style": "",
            "subpatcher_template": "",
            "assistshowspatchername": 0,
            "boxes": [
              {
                "box": {
                  "fontface": 1,
                  "fontname": "Meiryo",
                  "fontsize": 22,
                  "id": "setup-title",
                  "maxclass": "comment",
                  "numinlets": 1,
                  "numoutlets": 0,
                  "patching_rect": [
                    24,
                    18,
                    748,
                    36
                  ],
                  "presentation": 1,
                  "presentation_rect": [
                    24,
                    18,
                    748,
                    36
                  ],
                  "text": "SETUP  /  接続プロンプト",
                  "textcolor": [
                    0.29,
                    0.25,
                    0.4,
                    1
                  ]
                }
              },
              {
                "box": {
                  "fontname": "Meiryo",
                  "fontsize": 12,
                  "id": "setup-description",
                  "linecount": 2,
                  "maxclass": "comment",
                  "numinlets": 1,
                  "numoutlets": 0,
                  "patching_rect": [
                    26,
                    62,
                    750,
                    52
                  ],
                  "presentation": 1,
                  "presentation_linecount": 2,
                  "presentation_rect": [
                    26,
                    62,
                    750,
                    52
                  ],
                  "text": "下の文章をコピーして、接続したい Codex または Antigravity の会話に貼り付けます。\n「全文を選択」→ Ctrl+C → AI 側で Ctrl+V。ボタンだけでは設定を変更しません。",
                  "textcolor": [
                    0.29,
                    0.25,
                    0.4,
                    1
                  ]
                }
              },
              {
                "box": {
                  "bgcolor": [
                    0.72,
                    0.93,
                    0.8,
                    1
                  ],
                  "fontname": "Meiryo",
                  "fontsize": 12,
                  "id": "select-button",
                  "maxclass": "textbutton",
                  "numinlets": 1,
                  "numoutlets": 3,
                  "outlettype": [
                    "",
                    "",
                    "int"
                  ],
                  "parameter_enable": 0,
                  "patching_rect": [
                    26,
                    119,
                    150,
                    28
                  ],
                  "presentation": 1,
                  "presentation_rect": [
                    26,
                    119,
                    150,
                    28
                  ],
                  "saved_attribute_attributes": {
                    "bgcolor": {
                      "expression": ""
                    },
                    "textcolor": {
                      "expression": ""
                    }
                  },
                  "text": "全文を選択",
                  "textcolor": [
                    0.29,
                    0.25,
                    0.4,
                    1
                  ]
                }
              },
              {
                "box": {
                  "bgcolor": [
                    1,
                    1,
                    0.98,
                    1
                  ],
                  "border": 1,
                  "bordercolor": [
                    0.81,
                    0.78,
                    0.92,
                    1
                  ],
                  "fontname": "Meiryo",
                  "fontsize": 12,
                  "id": "prompt-editor",
                  "linecount": 24,
                  "maxclass": "textedit",
                  "numinlets": 1,
                  "numoutlets": 4,
                  "outlettype": [
                    "",
                    "int",
                    "",
                    ""
                  ],
                  "parameter_enable": 0,
                  "patching_rect": [
                    26,
                    163,
                    746,
                    550
                  ],
                  "presentation": 1,
                  "presentation_linecount": 24,
                  "presentation_rect": [
                    26,
                    163,
                    746,
                    550
                  ],
                  "text": "__SETUP_PROMPT__",
                  "textcolor": [
                    0.29,
                    0.25,
                    0.4,
                    1
                  ]
                }
              },
              {
                "box": {
                  "fontname": "Meiryo",
                  "fontsize": 10,
                  "id": "setup-foot",
                  "maxclass": "comment",
                  "numinlets": 1,
                  "numoutlets": 0,
                  "patching_rect": [
                    26,
                    723,
                    746,
                    23
                  ],
                  "presentation": 1,
                  "presentation_rect": [
                    26,
                    723,
                    746,
                    23
                  ],
                  "text": "初回だけの設定です。MCP の登録と接続確認が終われば、以後は Live を開いて会話から操作できます。",
                  "textcolor": [
                    0.29,
                    0.25,
                    0.4,
                    1
                  ]
                }
              },
              {
                "box": {
                  "id": "select-msg",
                  "maxclass": "message",
                  "numinlets": 2,
                  "numoutlets": 1,
                  "outlettype": [
                    ""
                  ],
                  "patching_rect": [
                    20,
                    800,
                    55,
                    22
                  ],
                  "text": "select"
                }
              },
              {
                "box": {
                  "comment": "",
                  "id": "setup-inlet",
                  "index": 1,
                  "maxclass": "inlet",
                  "numinlets": 0,
                  "numoutlets": 1,
                  "outlettype": [
                    ""
                  ],
                  "patching_rect": [
                    20,
                    840,
                    30,
                    30
                  ]
                }
              }
            ],
            "lines": [
              {
                "patchline": {
                  "destination": [
                    "select-msg",
                    0
                  ],
                  "source": [
                    "select-button",
                    0
                  ]
                }
              },
              {
                "patchline": {
                  "destination": [
                    "prompt-editor",
                    0
                  ],
                  "source": [
                    "select-msg",
                    0
                  ]
                }
              }
            ],
            "bgcolor": [
              1,
              0.976,
              0.914,
              1
            ],
            "editing_bgcolor": [
              1,
              0.976,
              0.914,
              1
            ],
            "saved_attribute_attributes": {
              "default_plcolor": {
                "expression": ""
              },
              "editing_bgcolor": {
                "expression": ""
              },
              "locked_bgcolor": {
                "expression": ""
              }
            }
          },
          "patching_rect": [
            510,
            410,
            160,
            20
          ],
          "saved_attribute_attributes": {
            "default_plcolor": {
              "expression": ""
            },
            "editing_bgcolor": {
              "expression": ""
            },
            "locked_bgcolor": {
              "expression": ""
            }
          },
          "saved_object_attributes": {
            "description": "",
            "digest": "",
            "editing_bgcolor": [
              1,
              0.976,
              0.914,
              1
            ],
            "globalpatchername": "",
            "locked_bgcolor": [
              1,
              0.976,
              0.914,
              1
            ],
            "tags": ""
          },
          "text": "p Live Bridge SETUP"
        }
      },
      {
        "box": {
          "id": "setup-open",
          "maxclass": "message",
          "numinlets": 2,
          "numoutlets": 1,
          "outlettype": [
            ""
          ],
          "patching_rect": [
            510,
            340,
            45,
            20
          ],
          "text": "open"
        }
      },
      {
        "box": {
          "id": "setup-control",
          "maxclass": "newobj",
          "numinlets": 1,
          "numoutlets": 1,
          "outlettype": [
            ""
          ],
          "patching_rect": [
            510,
            375,
            70,
            20
          ],
          "text": "pcontrol"
        }
      },
      {
        "box": {
          "id": "ai",
          "maxclass": "newobj",
          "numinlets": 2,
          "numoutlets": 2,
          "outlettype": [
            "signal",
            "signal"
          ],
          "patching_rect": [
            20,
            20,
            65,
            20
          ],
          "text": "plugin~"
        }
      },
      {
        "box": {
          "id": "ao",
          "maxclass": "newobj",
          "numinlets": 2,
          "numoutlets": 2,
          "outlettype": [
            "signal",
            "signal"
          ],
          "patching_rect": [
            20,
            80,
            65,
            20
          ],
          "text": "plugout~"
        }
      }
    ],
    "lines": [
      {
        "patchline": {
          "destination": [
            "ao",
            1
          ],
          "source": [
            "ai",
            1
          ]
        }
      },
      {
        "patchline": {
          "destination": [
            "ao",
            0
          ],
          "source": [
            "ai",
            0
          ]
        }
      },
      {
        "patchline": {
          "destination": [
            "js",
            0
          ],
          "source": [
            "defer",
            0
          ]
        }
      },
      {
        "patchline": {
          "destination": [
            "init",
            0
          ],
          "source": [
            "delay",
            0
          ]
        }
      },
      {
        "patchline": {
          "destination": [
            "help-open",
            0
          ],
          "source": [
            "help-button",
            0
          ]
        }
      },
      {
        "patchline": {
          "destination": [
            "help-window",
            0
          ],
          "source": [
            "help-control",
            0
          ]
        }
      },
      {
        "patchline": {
          "destination": [
            "help-control",
            0
          ],
          "source": [
            "help-open",
            0
          ]
        }
      },
      {
        "patchline": {
          "destination": [
            "js",
            0
          ],
          "source": [
            "init",
            0
          ]
        }
      },
      {
        "patchline": {
          "destination": [
            "send",
            0
          ],
          "source": [
            "js",
            0
          ]
        }
      },
      {
        "patchline": {
          "destination": [
            "delay",
            0
          ],
          "source": [
            "ready",
            0
          ]
        }
      },
      {
        "patchline": {
          "destination": [
            "setup-open",
            0
          ],
          "source": [
            "setup-button",
            0
          ]
        }
      },
      {
        "patchline": {
          "destination": [
            "setup-window",
            0
          ],
          "source": [
            "setup-control",
            0
          ]
        }
      },
      {
        "patchline": {
          "destination": [
            "setup-control",
            0
          ],
          "source": [
            "setup-open",
            0
          ]
        }
      },
      {
        "patchline": {
          "destination": [
            "defer",
            0
          ],
          "source": [
            "udp",
            0
          ]
        }
      }
    ],
    "latency": 0,
    "is_mpe": 0,
    "minimum_live_version": "",
    "minimum_max_version": "",
    "platform_compatibility": 0,
    "bgcolor": [
      1,
      0.976,
      0.914,
      1
    ],
    "saved_attribute_attributes": {
      "default_plcolor": {
        "expression": ""
      },
      "locked_bgcolor": {
        "expression": ""
      }
    }
  }
}
