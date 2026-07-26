import { collection, config, fields, singleton } from "@keystatic/core";
import { galleryCompositionField } from "./src/keystatic/gallery-composition";

const galleryAsset = {
  directory: "src/assets/galleries",
  publicPath: "@assets/galleries/",
};

const articleAsset = {
  directory: "src/assets/articles",
  publicPath: "@assets/articles/",
};

export default config({
  storage: {
    kind: "local",
  },
  ui: {
    brand: {
      name: "Joe 内容工作室",
    },
  },
  collections: {
    galleries: collection({
      label: "相册排版与发布",
      slugField: "workingTitle",
      path: "src/content/galleries/*/",
      format: { contentField: "body" },
      columns: ["workingTitle"],
      schema: {
        workingTitle: fields.slug({
          name: {
            label: "工作名称",
            description:
              "只用于在后台识别这组照片和生成固定地址，不会显示在正式网站上。",
            validation: { isRequired: true },
          },
        }),
        composition: galleryCompositionField,
        publication: fields.object(
          {
            title: fields.text({
              label: "正式标题",
              description: "发布前填写；这是访客最终看到的相册标题。",
            }),
            date: fields.date({
              label: "拍摄日期",
            }),
            location: fields.text({
              label: "地点",
            }),
            summary: fields.text({
              label: "简短介绍",
              multiline: true,
            }),
            cover: fields.image({
              label: "首页封面",
              ...galleryAsset,
            }),
            featuredOrder: fields.integer({
              label: "首页顺序",
              description: "数字越小越靠前。",
              defaultValue: 10,
              validation: { min: 0 },
            }),
            draft: fields.checkbox({
              label: "保持为草稿",
              description:
                "默认开启。照片排好后先保存草稿；标题、封面等填写完整后再关闭。",
              defaultValue: true,
            }),
          },
          {
            label: "阶段 2 · 发布信息",
            description:
              "照片编排完成后再处理这里。草稿阶段可以不填标题、日期和封面。",
          },
        ),
        body: fields.markdoc({
          label: "发布文字（可选）",
          description:
            "发布时再写。这里用于标题下方的开场文字；照片之间的短句请在编排器里插入文字块。",
          extension: "mdoc",
          options: {
            image: articleAsset,
          },
        }),
      },
    }),
    articles: collection({
      label: "隐藏文章",
      slugField: "title",
      path: "src/content/articles/*/",
      format: { contentField: "body" },
      columns: ["title", "date", "draft"],
      schema: {
        title: fields.slug({
          name: {
            label: "文章标题",
            validation: { isRequired: true },
          },
        }),
        date: fields.date({
          label: "发布日期",
          validation: { isRequired: true },
        }),
        summary: fields.text({
          label: "摘要",
          multiline: true,
        }),
        draft: fields.checkbox({
          label: "草稿",
          defaultValue: true,
        }),
        unlisted: fields.checkbox({
          label: "隐藏入口并禁止搜索引擎收录",
          defaultValue: true,
        }),
        body: fields.markdoc({
          label: "正文",
          extension: "mdoc",
          options: {
            image: articleAsset,
          },
        }),
      },
    }),
  },
  singletons: {
    settings: singleton({
      label: "网站设置",
      path: "src/content/site/settings",
      schema: {
        siteName: fields.text({
          label: "网站名称",
          defaultValue: "JOE / PHOTOGRAPHS",
          validation: { isRequired: true },
        }),
        introduction: fields.text({
          label: "个人介绍",
          multiline: true,
          defaultValue: "这里存放我拍下的照片，也留下一些文字。",
        }),
        email: fields.text({
          label: "联系邮箱",
          defaultValue: "joooooe-z@foxmail.com",
        }),
      },
    }),
  },
});
