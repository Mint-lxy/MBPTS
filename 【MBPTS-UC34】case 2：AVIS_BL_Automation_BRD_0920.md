# 【MBPTS-UC34】case 2：AVIS_BL_Automation_BRD_0920

欧线：船公司OOCL

- **触发机制：**每周定时触发，每周一早上9点运行，运行上周一至周日的数据（实际运行时间以系统为准）
- **业务流程：**

<!-- -->

- **Step 1：下载AVIS，进行记录并归档**

**1 打开Portal公邮，搜索“AVIS”**

**（1）邮件附件字段提取：AVIS No.   Customer code等如下所述**

**（2）邮件附件归档：将附件归档归入PDC>GLC文件夹下，按照运行周的时间新建文件夹，并在里面再按照，命名格式：Shippers Ref+ +OOLU+AWB/B/L No.+ +ETA+ETA日期**

PDC取自AVIS pdf里的Customer code，PDC和Customer Code的对应关系表如下（此对应关系表需做成可配置的形式，由业务老师后续维护），若AVIS里的Customer code不存在于配置表中，则需另建一个“Other”的folder，同时继续下述流程，文件存在此Other的文件夹中，并在“异常反馈”列记录该错误：

**记录字段：**

<img src="【MBPTS-UC34】case 2：AVIS_BL_Automation_BRD_0920_images/media/image5.png" style="width:4.65785in;height:0.86132in" />


<img src="【MBPTS-UC34】case 2：AVIS_BL_Automation_BRD_0920_images/media/image7.png" style="width:6.925in;height:1.98611in" />

**文件夹命名**示例如下：（在GLC或MBUSI的文件夹下再新建文件夹来存储AVIS/ BL/ Shipper等文件）

命名格式：Shippers Ref+ +OOLU+AWB/B/L No.+ +ETA+ETA日期

**527452 OOLU2036726960 ETA <span class="mark">2026.08.17</span>**

<img src="【MBPTS-UC34】case 2：AVIS_BL_Automation_BRD_0920_images/media/image8.png" style="width:6.6in;height:3.28809in" />

ETA和BL号码 时间从AVIS PDF 文件中获取， 提单No,要加”OOLU”4个字母。见上图

从PDF AVIS 中读取到”Arrival”,填写到 AVIS BL status report D列。

<img src="【MBPTS-UC34】case 2：AVIS_BL_Automation_BRD_0920_images/media/image9.png" style="width:6.925in;height:1.50903in" />

从PDF AVIS 中读取到”Estimated date of arrival”,填写到 AVIS BL status report F列。

<img src="【MBPTS-UC34】case 2：AVIS_BL_Automation_BRD_0920_images/media/image10.png" style="width:6.925in;height:1.36667in" />

- **Step 2:下载shipper，进行记录并归档（确认是否DG货物的判断逻辑）**

**5 **在Portal公邮上输入“**AVIS号”， 看是否能搜索出来对应的shipper 文件。**

**Shipper 文件基本和AVIS** **同一天发送到对应的公邮。**

Shipper 发件人：mbox-006-gsp-lsa-vds2@mercedes-benz.com<img src="【MBPTS-UC34】case 2：AVIS_BL_Automation_BRD_0920_images/media/image11.png" style="width:6.15in;height:3.6413in" />

邮件标题：Shippers_Decl_400759_1

<img src="【MBPTS-UC34】case 2：AVIS_BL_Automation_BRD_0920_images/media/image12.png" style="width:6.15in;height:5.14398in" />

如果可以搜索出来shipper, 需要将shipper 附件保存到对应的AVIS 文件夹里，并且将文件夹改名为527452 OOLU2036726960 ETA 2026.08.17 **DG**.

并且<span class="mark">AVIS BL status report</span> 即：大表上需要登记，填写到M列

<img src="【MBPTS-UC34】case 2：AVIS_BL_Automation_BRD_0920_images/media/image13.png" style="width:6.925in;height:1.4in" />

如果搜索出来是有shipper的，证明此票货物是DG 货物。 文件夹命名后面需要加”DG”

下载PDF版本的shippers\_ Decl需要重命名为shippers_Decl_BL 进行命名上传

- **Step 3:下载BL，进行记录并归档**

**6 搜索Portal公邮，限制邮件标题字段含有：Bill of landing。**

**注：Avis和BL邮件存在时间差，BL在AVIS发送的两三周后才会收到。**

搜索到新的提单，打开新提单，读取对应的<span class="mark">AVIS 号码</span>，然后需要跟AVIS BL status report 的已经登记的AVIS 做<span class="mark">匹配</span>。并且确认此行对应的BL No列为空。证明没有创建过此提单。

<img src="【MBPTS-UC34】case 2：AVIS_BL_Automation_BRD_0920_images/media/image14.png" style="width:6.91667in;height:2.25in" />

如果没有找到之前登记过的Avis, 则单独列一行，然后在P列异常情况反馈里标记，可能是国外漏发AVIS 情况。找不到AVIS 的此提单就可以先跳过，继续下一条。 人工确认后再跑。 异常情况反馈里可以填写“未找到对应AVIS，请确认是否漏发”

如果找到AVIS, 则可以继续创建BL。

将邮件附件中的提单先保存到对应的文件夹中。

BL 提单示例： 圈出来的是AVIS 号码。

<img src="【MBPTS-UC34】case 2：AVIS_BL_Automation_BRD_0920_images/media/image15.png" style="width:6.15in;height:3.6211in" />

<img src="【MBPTS-UC34】case 2：AVIS_BL_Automation_BRD_0920_images/media/image16.png" style="width:6.15in;height:3.7076in" />

<img src="【MBPTS-UC34】case 2：AVIS_BL_Automation_BRD_0920_images/media/image17.png" style="width:6.15in;height:3.61873in" />

将文件保存到文件夹后，将上传到IES +系统中的AVIS 及BL 的模板（Sheet0 and1 ）保存进文件夹里（准备文件模板）。

提单文件保存后，需要更改命名：BL_OOLU2038969910

原下载的PDF BL 命名如下图，需要规范更改。

<img src="【MBPTS-UC34】case 2：AVIS_BL_Automation_BRD_0920_images/media/image18.png" style="width:4.92198in;height:3.96641in" />

正常文件夹里面应包含以下文件：

<img src="【MBPTS-UC34】case 2：AVIS_BL_Automation_BRD_0920_images/media/image19.png" style="width:6.15in;height:1.55012in" />

将文件夹中的文件全部打开

将AVIS PDF 文件打开， 将AVIS 模板中对应的字段从AVIS 中提取出来。注意点保存。

<img src="【MBPTS-UC34】case 2：AVIS_BL_Automation_BRD_0920_images/media/image20.png" style="width:6.15in;height:3.39702in" />

<img src="【MBPTS-UC34】case 2：AVIS_BL_Automation_BRD_0920_images/media/image21.png" style="width:6.15in;height:3.73448in" />

新增如下提示：填入“导入模板-AVIS”对应关系如下图标注：

<img src="【MBPTS-UC34】case 2：AVIS_BL_Automation_BRD_0920_images/media/image22.png" style="width:6.925in;height:5.04861in" />

<img src="【MBPTS-UC34】case 2：AVIS_BL_Automation_BRD_0920_images/media/image23.png" style="width:6.925in;height:4.73194in" />

AVIS 模板字段，均可以从AVIS 中获取

<img src="【MBPTS-UC34】case 2：AVIS_BL_Automation_BRD_0920_images/media/image24.png" style="width:6.15in;height:1.94133in" />

**11 登陆IES+, 点击进口管理，发票信息，点击右上角“点击查询”**

<img src="【MBPTS-UC34】case 2：AVIS_BL_Automation_BRD_0920_images/media/image25.png" style="width:6.15in;height:3.27143in" />

**12：将MBZ 全部复制到查询栏MBZ/DN：**

**MBZ 可以直接复制，空格在系统中直接自动加上。**

<img src="【MBPTS-UC34】case 2：AVIS_BL_Automation_BRD_0920_images/media/image26.png" style="width:6.15in;height:3.2949in" />

点击确定后，系统会出现对应的发票。

<img src="【MBPTS-UC34】case 2：AVIS_BL_Automation_BRD_0920_images/media/image27.png" style="width:6.15in;height:3.19404in" />

此处已经显示对应的22张发票。

**13点击左上“导入”， 选择“批量导入AVIS”**

<img src="【MBPTS-UC34】case 2：AVIS_BL_Automation_BRD_0920_images/media/image28.png" style="width:6.15in;height:3.31946in" />

**14 点击选择文件，打开对应的文件夹**

<img src="【MBPTS-UC34】case 2：AVIS_BL_Automation_BRD_0920_images/media/image29.png" style="width:6.15in;height:3.24286in" />

选中avis Excel 文件， 点open,

<img src="【MBPTS-UC34】case 2：AVIS_BL_Automation_BRD_0920_images/media/image30.png" style="width:6.15in;height:3.45724in" />

等待绿灯后，点击上传

<img src="【MBPTS-UC34】case 2：AVIS_BL_Automation_BRD_0920_images/media/image31.png" style="width:6.15in;height:2.63382in" />

**15 上传完成后会自动退回到这个界面**

<img src="【MBPTS-UC34】case 2：AVIS_BL_Automation_BRD_0920_images/media/image32.png" style="width:6.15in;height:3.69in" />

上传成功后，，回写到AVIS BL status report 报告中的G列

**16 此时，<span class="mark">如果是DG 货物</span>,(前面搜索AVIS 的时候会带出来Shipper,用来识别是不是DG 货物)， 需要点击“导出”， 点击按invoice 级别模板全部导出。**

**此处在最开始搜索Shipper处就记录下是否是”DG”货物。**

<img src="【MBPTS-UC34】case 2：AVIS_BL_Automation_BRD_0920_images/media/image33.png" style="width:6.15in;height:3.3369in" />

打开excel后， 加filter小按钮后，在total amount 后面加一列：增加公式（如下）

<img src="【MBPTS-UC34】case 2：AVIS_BL_Automation_BRD_0920_images/media/image34.png" style="width:6.15in;height:3.55937in" />

<img src="【MBPTS-UC34】case 2：AVIS_BL_Automation_BRD_0920_images/media/image35.png" style="width:6.15in;height:1.70813in" />

寻找差异，价格差异不为0则视为有差异。

根据差异找到，此差异为PDF 发票中对应的FOB charges。

然后对应的发票，点击批量下载，下载附件。

Remark：在Invoice No 输入invoice号码可以找到对应发票。

<img src="【MBPTS-UC34】case 2：AVIS_BL_Automation_BRD_0920_images/media/image36.png" style="width:6.925in;height:3.54583in" />

<img src="【MBPTS-UC34】case 2：AVIS_BL_Automation_BRD_0920_images/media/image37.png" style="width:6.15in;height:3.59272in" />

<img src="【MBPTS-UC34】case 2：AVIS_BL_Automation_BRD_0920_images/media/image38.png" style="width:6.15in;height:1.90138in" />

点击download 的附件，点击打开。

<img src="【MBPTS-UC34】case 2：AVIS_BL_Automation_BRD_0920_images/media/image39.png" style="width:6.15in;height:3.56304in" />

核对PDF 发票中Fob charge 和刚才excel 表中的差异值，核对，核对无误后。如果有这个PDF发票但金额不一致以IES导出的FOB值为准，同时在“异常反馈”列进行记录。

回到IES 界面，点击对应发票的修改按钮。

如果没有下载到对应的发票，可能是还未来得及上传，那就先按照EXCEL 中的价格差异值填写。但是需要在异常结果反馈里记录下，“未找到1063098768发票”

<img src="【MBPTS-UC34】case 2：AVIS_BL_Automation_BRD_0920_images/media/image40.png" style="width:6.15in;height:1.06669in" />

将FOB charge 填入others，点击保存。

<img src="【MBPTS-UC34】case 2：AVIS_BL_Automation_BRD_0920_images/media/image41.png" style="width:6.15in;height:3.21133in" />

同理，将涉及到FOB charges 费用全部填写完成后，点击保存。

**18 进入到制作预报界面：点击全选，然后点击 生成预报**

<img src="【MBPTS-UC34】case 2：AVIS_BL_Automation_BRD_0920_images/media/image42.png" style="width:6.15in;height:3.42896in" />

弹出下面选择框，需要根据红字部分进行选择和输入。

信息均来源于<span class="mark">提单</span>。完成后点击确定。

<img src="【MBPTS-UC34】case 2：AVIS_BL_Automation_BRD_0920_images/media/image43.png" style="width:6.15in;height:2.54443in" />

<img src="【MBPTS-UC34】case 2：AVIS_BL_Automation_BRD_0920_images/media/image22.png" style="width:6.925in;height:5.04861in" />

<img src="【MBPTS-UC34】case 2：AVIS_BL_Automation_BRD_0920_images/media/image44.png" style="width:6.15in;height:3.49766in" />

请看下图BL 中字段对应IES 描述：

船名航次直接COPY 即可。

<img src="【MBPTS-UC34】case 2：AVIS_BL_Automation_BRD_0920_images/media/image45.png" style="width:6.925in;height:4.01389in" />

**19 回到IES 进口管理，点击进口预报界面，选择“点击查询”**

<img src="【MBPTS-UC34】case 2：AVIS_BL_Automation_BRD_0920_images/media/image46.png" style="width:6.15in;height:3.21184in" />

**20 输入提单号后点击确定。预报界面会出现对应的提单。**

<img src="【MBPTS-UC34】case 2：AVIS_BL_Automation_BRD_0920_images/media/image47.png" style="width:6.15in;height:3.21897in" />

**21 打开PDF 提单，和excel BL 文件**

<img src="【MBPTS-UC34】case 2：AVIS_BL_Automation_BRD_0920_images/media/image48.png" style="width:6.15in;height:3.61161in" />

将BL_Excel 所需提取的字段从BL 中找到，并填写。

<img src="【MBPTS-UC34】case 2：AVIS_BL_Automation_BRD_0920_images/media/image49.png" style="width:6.15in;height:1.56632in" />

新增导入的对应关系如下

**注：Container Type需改成单位“‘”**

<img src="【MBPTS-UC34】case 2：AVIS_BL_Automation_BRD_0920_images/media/image50.png" style="width:6.925in;height:2.11458in" />

<img src="【MBPTS-UC34】case 2：AVIS_BL_Automation_BRD_0920_images/media/image51.png" style="width:6.925in;height:2.89167in" />

**22回到IES +界面， 点击修改。**

<img src="【MBPTS-UC34】case 2：AVIS_BL_Automation_BRD_0920_images/media/image52.png" style="width:6.15in;height:2.01265in" />

**23进入后，往下拉找到集装箱信息，点击导入**

<img src="【MBPTS-UC34】case 2：AVIS_BL_Automation_BRD_0920_images/media/image53.png" style="width:6.15in;height:3.49007in" />

<img src="【MBPTS-UC34】case 2：AVIS_BL_Automation_BRD_0920_images/media/image54.png" style="width:6.15in;height:3.28927in" />

选择刚才做好的BL excel 文件，点击open

<img src="【MBPTS-UC34】case 2：AVIS_BL_Automation_BRD_0920_images/media/image55.png" style="width:6.15in;height:3.92745in" />

<img src="【MBPTS-UC34】case 2：AVIS_BL_Automation_BRD_0920_images/media/image56.png" style="width:6.15in;height:2.59555in" />

出现绿灯之后，点击上传。

如果提单和发票没有差异，会出现导入成功，生成台账成功的字样。

<img src="【MBPTS-UC34】case 2：AVIS_BL_Automation_BRD_0920_images/media/image57.png" style="width:6.15in;height:2.38539in" />

如果系统弹出来一个框，显示有差异，需要保存文件框里的差异，回写到AVIS BL status report 报告中的L列“BL different”。

下图为差异项弹窗。请参考。

<img src="【MBPTS-UC34】case 2：AVIS_BL_Automation_BRD_0920_images/media/image58.png" style="width:6.925in;height:3.80556in" />

<img src="【MBPTS-UC34】case 2：AVIS_BL_Automation_BRD_0920_images/media/image59.png" style="width:6.6in;height:3.71697in" />

**24然后往下拉，上传文件。**

<img src="【MBPTS-UC34】case 2：AVIS_BL_Automation_BRD_0920_images/media/image60.png" style="width:6.15in;height:1.68608in" />

点击上传按钮，

<img src="【MBPTS-UC34】case 2：AVIS_BL_Automation_BRD_0920_images/media/image61.png" style="width:6.15in;height:2.46221in" />

根据上传的文件，选择文件类别，然后选择文件，点击保存

<img src="【MBPTS-UC34】case 2：AVIS_BL_Automation_BRD_0920_images/media/image62.png" style="width:6.15in;height:3.23527in" />

<img src="【MBPTS-UC34】case 2：AVIS_BL_Automation_BRD_0920_images/media/image63.png" style="width:6.15in;height:3.98919in" />

AVIS 选择other -文件类别

<img src="【MBPTS-UC34】case 2：AVIS_BL_Automation_BRD_0920_images/media/image64.png" style="width:6.15in;height:3.69276in" />

都上传完毕后，点击保存。

<img src="【MBPTS-UC34】case 2：AVIS_BL_Automation_BRD_0920_images/media/image65.png" style="width:6.15in;height:3.33942in" />

此票提单创建完成，然后回写AVIS BL status report 报告。如果PDF 均上传成功，则回写到HKN列，回写Y 。

此票提单全部创建完成回写到J“ BL Creation”

**25 对应附件**

| **Documentation Name**                | **Content** | **Remark** |
| ------------------------------------------- | ----------------- | ---------------- |
| AVIS BL import report template (sheet 0& 1) |                   |                  |
| AVIS detail list (Sheet2)                   |                   |                  |
| AVIS BL status report (Sheet3)              |                   |                  |
