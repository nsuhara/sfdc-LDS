# はじめに

*(Mac環境の記事ですが、Windows環境も同じ手順になります。環境依存の部分は読み替えてお試しください。)*

この記事を最後まで読むと、次のことができるようになります。

- Lightningデータサービス(LDS)について理解する
- LDSを使って実装する

`イメージ画像`

| レイアウトにLDSを実装                                                                                                                                                     |
| :-----------------------------------------------------------------------------------------------------------------------------------------------------------------------: |
| <img width="500" alt="スクリーンショット 2019-03-01 18.25.49.png" src="https://qiita-image-store.s3.amazonaws.com/0/326996/26173a91-9000-7d88-bc54-2723d46d29e4.png">     |
|                                                                                                                                                                           |

| クイックアクションLDSを実装                                                                                                                                               |
| :-----------------------------------------------------------------------------------------------------------------------------------------------------------------------: |
| <img width="500" alt="スクリーンショット 2019-03-01 18.18.00.png" src="https://qiita-image-store.s3.amazonaws.com/0/326996/e6252651-96ea-8885-24fa-c6165789eb23.png">     |

# 関連する記事

- [Trailhead Lightning Experience 向けの開発](https://trailhead.salesforce.com/ja/content/learn/trails/lex_dev)
- [Trailhead Lightning データサービスの基本](https://trailhead.salesforce.com/ja/content/learn/modules/lightning_data_service?trail_id=lex_dev)

# 実行環境

|     環境     |    Ver.    |
|--------------|------------|
| macOS Mojave | 10.14.3    |
| Salesforce   | Winter '18 |

# ソースコード

実際に実装内容やソースコードを追いながら読むとより理解が深まるかと思います。是非ご活用ください。

[GitHub](https://github.com/nsuhara/sfdc-LDS.git)

# Lightningデータサービスの特徴

Lightningデータサービス(LDS)は、`Salesforce Winter '18`より使用可能となりました。LDSを使用すると、Apexコードを必要とせずに、コンポーネントでレコードの読み込み、作成、編集、削除ができます。LDSに読み込まれたレコードはキャッシュされ、コンポーネント間で共有されます。サーバ側のApexコントローラの処理やデータアクセスが減少するため、パフォーマンスの改善が期待できます。

- XMLHttpRequests (XHR) を最小限に抑える
- レコードを 1 回だけ取得し、ネットワーク転送を減らし、アプリケーションサーバとデータベースサーバの負荷を軽減する
- コンポーネントのメタデータとは別にレコードデータをクライアントでキャッシュする
- コンポーネント間でレコードデータを共有する
- レコードの段階的な読み取り、キャッシュ、およびキャッシュへのより多くの項目とレイアウトのマージを可能にする
- プロアクティブなキャッシュ入力を可能にする
- 複数のコンポーネント間で 1 つのレコードデータインスタンスのみを使用することで、一貫性を促進する
- レコードデータの変更時に通知を作成する

# LDSの実装方法

## force:recordDataタグについて

LDSを実装するには、コンポーネントに`force:recordData`タグを記述します。

```sample.cmp
<force:recordData aura:id="recordEditor"
    layoutType="FULL"
    recordId="{!v.recordId}"
    targetError="{!v.recordError}"
    targetRecord="{!v.record}"
    targetFields="{!v.accountRecord}"
    fields="Name,Phone"
    recordUpdated="{!c.handleRecordUpdated}"
    mode="EDIT" />
```

|      属性     |                説明               |
|---------------|-----------------------------------|
| layoutType    | レイアウトタイプ(FULL or COMPACT) |
| recordId      | 読み込むレコードID                |
| targetError   | エラー結果                        |
| targetRecord  | 読み込まれたレコード              |
| targetFields  | 読み込まれたレコードの簡易ビュー  |
| fields        | 照会項目                          |
| recordUpdated | 変更アクション                    |
| mode          | 操作モード(EDIT or VIEW)          |

# LDSの実装例

取引先(Account)のレコードを`レイアウト表示`と`クイックアクション`から編集できるようにする。

1. 編集をもつコンポーネントを作成する
1. 取引先レイアウトにコンポーネントを設定する
1. クイックアクションにコンポーネントを設定する

## コンポーネント実装

```idsAccountEdit.cmp
<aura:component
    implements="flexipage:availableForRecordHome,force:hasRecordId,force:hasSObjectName,force:lightningQuickActionWithoutHeader">

    <aura:attribute name="record" type="Object" />
    <aura:attribute name="accountRecord" type="Account" />
    <aura:attribute name="recordError" type="String" default="" />

    <force:recordData aura:id="recordEditor" layoutType="FULL" recordId="{!v.recordId}" targetError="{!v.recordError}"
        targetRecord="{!v.record}" targetFields="{!v.accountRecord}" fields="Name,Phone"
        recordUpdated="{!c.handleRecordUpdated}" mode="EDIT" />

    <aura:if isTrue="{!not(empty(v.recordError))}">
        <div class="recordError">
            {!v.recordError}</div>
    </aura:if>

    <div class="Record Details">
        <lightning:card iconName="action:edit" title="{!'Edit ' + v.sObjectName}">
            <aura:set attribute="footer">
                <lightning:button label="Save" onclick="{!c.handleSaveRecord}" class="slds-button slds-button_brand" />
            </aura:set>
            <div class="slds-p-horizontal--small">
                <lightning:input label="Name" value="{!v.accountRecord.Name}" />
                <lightning:input label="Phone" value="{!v.accountRecord.Phone}" />
            </div>
        </lightning:card>
    </div>

</aura:component>
```

## コントローラ実装

```ldsAccountEditController.js
({
    handleSaveRecord: function (component, event, helper) {
        var recordEditor = component.find("recordEditor");
        recordEditor.saveRecord($A.getCallback(function (saveResult) {
            if (saveResult.state === "ERROR") {
                var errMsg = "";
                for (var err of saveResult.error) {
                    errMsg += err.message + "\n";
                }
                component.set("v.recordError", errMsg);
            } else {
                component.set("v.recordError", "");
                $A.get("e.force:closeQuickAction").fire();
            }
        }));
    },

    handleRecordUpdated: function (component, event, helper) {
        var eventParams = event.getParams();
        if (eventParams.changeType === "CHANGED") {
            var changedFields = eventParams.changedFields;
            console.log('Fields that are changed: ' + JSON.stringify(changedFields));
            var resultsToast = $A.get("e.force:showToast");
            resultsToast.setParams({
                "title": "Saved",
                "message": "The record was updated."
            });
            resultsToast.fire();
        } else if (eventParams.changeType === "LOADED") {
            // record is loaded in the cache
        } else if (eventParams.changeType === "REMOVED") {
            // record is deleted and removed from the cache
        } else if (eventParams.changeType === "ERROR") {
            console.log('Error: ' + component.get("v.error"));
        }
    }
})
```

## レイアウト設定

設定 > オブジェクトマネージャ > 取引先 > Lightning レコードページ > 新規

<img width="500" alt="スクリーンショット 2019-03-01 18.41.31.png" src="https://qiita-image-store.s3.amazonaws.com/0/326996/96b593eb-11ce-c15c-f4e7-9c29175f9f59.png">

## クイックアクション設定

設定 > オブジェクトマネージャ > 取引先 > ボタン、リンク、およびアクション > 新規アクション

<img width="500" alt="スクリーンショット 2019-03-01 19.04.03.png" src="https://qiita-image-store.s3.amazonaws.com/0/326996/2a9f5fed-7f6c-50e9-6f66-443a7732169f.png">

設定 > オブジェクトマネージャ > 取引先 > ページレイアウト > Account Layout > 編集

<img width="500" alt="スクリーンショット 2019-03-01 19.04.41.png" src="https://qiita-image-store.s3.amazonaws.com/0/326996/2c1a62e7-1e6c-212e-67e3-b2703734a594.png">
