const fs = require('fs');
let admin = fs.readFileSync('client/src/pages/admin.tsx', 'utf-8');

const tabListCode = <TabsTrigger value="proxies" className="flex items-center gap-2"><Bot className="h-4 w-4" /> Proxies</TabsTrigger>;
if (!admin.includes('value="proxies"')) {
    admin = admin.replace('<TabsTrigger value="promotions"', tabListCode + '\n              <TabsTrigger value="promotions"');
}

const tabContentCode = 
          <TabsContent value="proxies" className="space-y-6">
            <Card className="border-white/10 bg-black/40 backdrop-blur-xl">
              <CardHeader>
                <CardTitle className="text-xl font-bold flex items-center gap-2">
                  <Bot className="h-6 w-6 text-green-500" />
                  Live Red Team Proxy Tracker (Phase 1)
                </CardTitle>
              </CardHeader>
              <CardContent>
                <DatabaseProxyUI />
              </CardContent>
            </Card>
          </TabsContent>;

if (!admin.includes('<TabsContent value="proxies"')) {
    admin = admin.replace('</TabsContent>\n        </Tabs>', '</TabsContent>\n' + tabContentCode + '\n        </Tabs>');
}

const reactComponent = 
function DatabaseProxyUI() {
    const { data, isLoading, refetch } = useQuery({ queryKey: ["/api/admin/proxy-status"] });
    return (
        <div className="space-y-4">
            <div className="flex items-center justify-between">
                <Badge variant={data?.poolSize > 0 ? "default" : "destructive"}>
                   Active Nodes: {data?.poolSize || 0}
                </Badge>
                <Button onClick={() => refetch()} variant="outline" size="sm">Refresh Network</Button>
            </div>
            {isLoading ? <p>Scanning RAM...</p> : (
                <div className="bg-black border border-white/10 rounded overflow-hidden">
                    {data?.proxies?.map((ip: string, i: number) => (
                        <div key={i} className="p-3 border-b border-white/5 font-mono text-sm text-green-400 flex justify-between">
                            <span>{ip}</span>
                            <span className="text-white/40">Healthy</span>
                        </div>
                    ))}
                </div>
            )}
        </div>
    )
}
;

if (!admin.includes('DatabaseProxyUI')) {
    admin = admin.replace('const Admin = () => {', reactComponent + '\nconst Admin = () => {');
}

fs.writeFileSync('client/src/pages/admin.tsx', admin);
console.log("Updated Admin UI with Proxy Tab");
